'use strict';
        
const _DEFAULT_FILES_TO_IGNORE = [
    '.DS_Store',
    'Thumbs.db'
];

const _EXTENSION_TO_MIME_TYPE_MAP = {
    avi: 'video/avi',
    gif: 'image/gif',
    ico: 'image/x-icon',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    mkv: 'video/x-matroska',
    mov: 'video/quicktime',
    mp4: 'video/mp4',
    pdf: 'application/pdf',
    png: 'image/png',
    zip: 'application/zip'
};

const _shouldIgnoreFile = (file) => {
    return _DEFAULT_FILES_TO_IGNORE.indexOf(file.name) >= 0;
}

const _copyString = (aString) => {
    return ` ${aString}`.slice(1);
}

const _traverseDirectory = (entry) => {
    const reader = entry.createReader();
    return new Promise((resolveDirectory) => {
        const iterationAttempts = [];
        const errorHandler = () => {};

        function readEntries() {
            // According to the FileSystem API spec, readEntries() must be called until
            // it calls the callback with an empty array.
            reader.readEntries((batchEntries) => {
                if (!batchEntries.length) {
                    // Done iterating this particular directory
                    resolveDirectory(Promise.all(iterationAttempts));
                } else {
                    // Add a list of promises for each directory entry.  If the entry is itself
                    // a directory, then that promise won't resolve until it is fully traversed.
                    iterationAttempts.push(Promise.all(batchEntries.map((batchEntry) => {
                        if (batchEntry.isDirectory) {
                            return _traverseDirectory(batchEntry);
                        }
                        return Promise.resolve(batchEntry);
                    })));
                    // Try calling readEntries() again for the same dir, according to spec
                    readEntries();
                }
            }, errorHandler);
        }
        // initial call to recursive entry reader function
        readEntries();
    });
}

// package the file in an object that includes the fullPath from the file entry
// that would otherwise be lost
const _packageFile = (file, entry) => {
    let fileTypeOverride = '';
    // handle some browsers sometimes missing mime types for dropped files
    const hasExtension = file.name && file.name.lastIndexOf('.') !== -1;
    if (hasExtension && !file.type) {
        const fileExtension = (file.name || '')
            .split('.')
            .pop();
        fileTypeOverride = _EXTENSION_TO_MIME_TYPE_MAP[fileExtension];
    }
    return {
        fileObject: file, // provide access to the raw File object (required for uploading)
        fullPath: entry ? _copyString(entry.fullPath) : file.name,
        lastModified: file.lastModified,
        lastModifiedDate: file.lastModifiedDate,
        name: file.name,
        size: file.size,
        type: file.type ? file.type : fileTypeOverride,
        webkitRelativePath: file.webkitRelativePath
    };
}

const _getFile =  (entry) => {
    return new Promise((resolve) => {
        entry.file((file) => {
            resolve(_packageFile(file, entry));
        });
    });
}

const _handleFilePromises = (promises, fileList) => {
    return Promise.all(promises)
        .then((files) => {
            files.forEach((file) => {
                if (!_shouldIgnoreFile(file)) {
                    fileList.push(file);
                }
            });
            return fileList;
        });
}

const _getDataTransferFiles = (dataTransfer) => {
    const dataTransferFiles = [];
    const folderPromises = [];
    const filePromises = [];

    [].slice.call(dataTransfer.items)
        .forEach((listItem) => {
            if (typeof listItem.webkitGetAsEntry === 'function') {
                const entry = listItem.webkitGetAsEntry();

                if (entry) {
                    if (entry.isDirectory) {
                        folderPromises.push(_traverseDirectory(entry));
                    } else {
                        filePromises.push(_getFile(entry));
                    }
                }
            } else {
                dataTransferFiles.push(listItem);
            }
        });
    if (folderPromises.length) {
        const flatten = (array) => array.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);
        return Promise.all(folderPromises)
            .then((fileEntries) => {
                const flattenedEntries = flatten(fileEntries);
                // collect async promises to convert each fileEntry into a File object
                flattenedEntries.forEach((fileEntry) => {
                    filePromises.push(_getFile(fileEntry));
                });
                return _handleFilePromises(filePromises, dataTransferFiles);
            });
    } else if (filePromises.length) {
        return _handleFilePromises(filePromises, dataTransferFiles);
    }
    return Promise.resolve(dataTransferFiles);
}

const _getDroppedOrSelectedFiles = (event) => {
    const dataTransfer = event.dataTransfer;
    if (dataTransfer && dataTransfer.items) {
        return _getDataTransferFiles(dataTransfer)
            .then((fileList) => {
                return Promise.resolve(fileList);
            });
    }
    const files = [];
    const dragDropFileList = dataTransfer && dataTransfer.files;
    const inputFieldFileList = event.target && event.target.files;
    const fileList = dragDropFileList || inputFieldFileList || [];
    // convert the FileList to a simple array of File objects
    for (let i = 0; i < fileList.length; i++) {
        files.push(_packageFile(fileList[i]));
    }
    return Promise.resolve(files);
}

export const fancyDropzone = {
    getDroppedOrSelectedFiles: (e) => {
        return _getDroppedOrSelectedFiles(e);
    },
    getDataTransferFiles : (dataTransfer) => {
        return _getDataTransferFiles(dataTransfer);
    }
}