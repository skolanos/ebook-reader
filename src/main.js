const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const logger = require('./utils/logger');
const fileUtils = require('./utils/file-utils');
const epubUtils = require('./utils/epub-utils');

/**
 * @typedef {Object} AppPreferences
 * @property {string} tmpDirPrefix
 *
 * @typedef {Object} AppOptions
 * @property {string} tmp_dir
 * @property {string} unzip_dir
 * @property {string} covers_dir
 */

/** @type {BrowserWindow} */
let mainWindow = null;
/** @type {AppOptions} */
let appOptions = null;
/** @type {Array<any>} */
let booksEntries = null;
let currentBookEntry = null;
/** @type {AppPreferences} */
const appPreferences = {
	tmpDirPrefix: '.ebook_reader.'
};

const setup = async (/** @type {AppPreferences} */ appPrefs) => {
	// logger.debug('setup: appPrefs=[' + JSON.stringify(appPrefs) + ']');
	const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), appPrefs.tmpDirPrefix));
	const unzipDir = path.join(tmpDir, '/unzip');
	const coversDir = path.join(tmpDir, '/covers');
	await fs.promises.mkdir(unzipDir);
	await fs.promises.mkdir(coversDir);

	return {
		tmp_dir: tmpDir,
		unzip_dir: unzipDir,
		covers_dir: coversDir
	};
};

const cleanup = async (/** @type {AppOptions} */options) => {
	// logger.debug('cleanup: options=[' + JSON.stringify(options) + ']');
	if (options && options.tmp_dir) {
		if (!fs.existsSync(options.tmp_dir)) {
			logger.error('cleanup: ścieżka nie istnieje path=[' + options.tmp_dir + ']');
			throw new Error('Ścieżka nie istnieje na dysku.');
		}
		await fs.promises.rm(options.tmp_dir, { recursive: true });
	}
};

const createWindow = () => {
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			preload: path.join(__dirname, './preload.js'),
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: true
		}
	});

	mainWindow.loadFile(path.join(__dirname, '../index.html'));
};

app.whenReady().then(async () => {
	appOptions = await setup(appPreferences);
	logger.debug('on("ready"): appOptions=[' + JSON.stringify(appOptions) + ']'); // DEBUG: pokazanie ścieżki do katalogu tymczasowego

	createWindow();

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

let cleanupDone = false;

app.on('before-quit', async (event) => {
	logger.debug('on("before-quit"): przed zamknięciem aplikacji');

	try {
		if (!cleanupDone) {
			event.preventDefault();
			await cleanup(appOptions);
			cleanupDone = true;
			app.quit();
		}
	} catch (e) {
		logger.error('on("before-quit"): wystąpił wyjątek przy sprzątaniu podczas zamykania aplikacji - ' + e);
		throw new Error('Wystąpił wyjątek przy sprzątaniu podczas zamykania aplikacji');
	}
});

app.on('quit', async () => {
	// logger.debug('on("quit"): zamykanie aplikacji');
});

ipcMain.handle('select-directory', async () => {
	const result = await dialog.showOpenDialog(mainWindow, {
		properties: ['openDirectory']
	});

	let libraryPageHtml = '';
	if (!result.canceled) {
		// pobierz nazwy plików znajdujących się w bibliotece
		const files = await fileUtils.getListOfFiles(result.filePaths[0], false);
		// pobierz informacje o każdej pozycji w bibliotece
		booksEntries = await epubUtils.prepareBooksTitles(appOptions, files);
		// logger.debug('select-directory: booksEntries=[' + JSON.stringify(booksEntries) + ']'); // DEBUG:
		libraryPageHtml = epubUtils.prepareLibraryPageHtml(appOptions, booksEntries);
	}

	return {
		path: result,
		content: libraryPageHtml
	};
});

ipcMain.handle('prepare-book-to-read', async (event, bookUid) => {
	const bookEntry = booksEntries.find((element) => element.uid === bookUid);
	// logger.debug('prepare-book-to-read: bookEntry=[' + JSON.stringify(bookEntry) + ']');
	let html = '';
	if (bookEntry) {
		currentBookEntry = bookEntry;
		html = await epubUtils.prepareBookToRead(appOptions, currentBookEntry);
		// logger.debug('prepare-book-to-read: html=[' + html + ']');
	}

	return {
		currentPage: currentBookEntry.current_page_idx + 1,
		totalPages: currentBookEntry.toc.length,
		content: html
	};
});

ipcMain.handle('get-book-prev-page', async () => {
	let html = '';
	if (currentBookEntry) {
		if (currentBookEntry.current_page_idx > 0) {
			currentBookEntry.current_page_idx--;
			html = await epubUtils.getEpubPageContent(appOptions, currentBookEntry);
			return {
				currentPage: currentBookEntry.current_page_idx + 1,
				totalPages: currentBookEntry.toc.length,
				content: html
			};
		}
	}

	return undefined;
});

ipcMain.handle('get-book-next-page', async () => {
	let html = '';
	if (currentBookEntry) {
		if (currentBookEntry.current_page_idx < currentBookEntry.toc.length - 1) {
			currentBookEntry.current_page_idx++;
			html = await epubUtils.getEpubPageContent(appOptions, currentBookEntry);
			return {
				currentPage: currentBookEntry.current_page_idx + 1,
				totalPages: currentBookEntry.toc.length,
				content: html
			};
		}
	}

	return undefined;
});
