const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronApi', {
	/* getVersion: () => process.versions.electron, */
	selectDirectory: () => ipcRenderer.invoke('select-directory'),
	prepareBookToRead: (bookUid) => ipcRenderer.invoke('prepare-book-to-read', bookUid),
	getBookPrevPage: () => ipcRenderer.invoke('get-book-prev-page'),
	getBookNextPage: () => ipcRenderer.invoke('get-book-next-page')
});

process.once('loaded', () => {
	window.addEventListener('message', (event) => {
		if (event.data.type === 'select-directory') {
			ipcRenderer.send('select-directory');
		}
	});
});
