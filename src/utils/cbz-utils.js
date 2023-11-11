const path = require('node:path');
const fs = require('node:fs');
const { v4: uuidv4 } = require('uuid');
const AdmZip = require('adm-zip');

const logger = require('./logger');

/**
 *
 * @param {*} options
 * @param {string} fileName
 * @param {string} fileDir
 * @returns
 */
const getCbzInfo = async (options, fileName, fileDir) => {
	const title = path.parse(fileName).name.replace(/_/g, ' ').replace(/-/g, ' ');
	const creator = '';
	const cover = 'cbz-cover.png';
	const coverRootDirSrc = './img/';

	// pobranie spisu treści
	const toc = getCbzTableOfContentsByEntries(options, fileName);

	return {
		uid: uuidv4(),
		file_path: fileName,
		mimetype: 'application/cbz',
		title,
		creator,
		cover,
		cover_root_dir_src: coverRootDirSrc,
		toc
	};
};

const prepareBookToRead = async (options, bookInfo) => {
	// wyczyszczenie zawartości katalogu przechowującego rozkompresowane pliki z książki
	await fs.promises.rm(options.unzip_dir, { recursive: true });
	await fs.promises.mkdir(options.unzip_dir);

	// rozkompresowanie zawartości pliku do katalogu tymczasowego
	const zip = new AdmZip(bookInfo.file_path);
	zip.extractAllTo(options.unzip_dir);

	bookInfo.current_page_idx = 0; // TODO: tego nie powinno się ustawiać na 0 bo zaczyna się czytać za każdym razem od początku
	const html = getCbzPageContent(options, bookInfo);

	// logger.debug('prepareBookToRead: html=[' + html + ']');

	return html;
};

const getCbzPageContent = (options, bookInfo) => {
	const filePath = bookInfo.toc[bookInfo.current_page_idx].href;
	const html = '<img id="img-content" class="img-content" src="' + filePath + '">';

	return html;
};

const getCbzTableOfContentsByEntries = (options, fileName) => {
	const toc = [];

	const mimetypes = [
		{ ext: '.bmp', mimetype: 'image/bmp' },
		{ ext: '.gif', mimetype: 'image/gif' },
		{ ext: '.jpg', mimetype: 'image/jpeg' },
		{ ext: '.jpeg', mimetype: 'image/jpeg' },
		{ ext: '.png', mimetype: 'image/png' },
		{ ext: '.tif', mimetype: 'image/tiff' },
		{ ext: '.tiff', mimetype: 'image/tiff' }
	];

	const zip = new AdmZip(fileName);
	const zipEntries = zip.getEntries();
	const files = zipEntries.map(entry => path.join(options.unzip_dir, entry.entryName)).sort();

	for (const file of files) {
		const ext = path.parse(file).ext.toLowerCase();
		const mimetypeItem = mimetypes.find(element => element.ext === ext);
		const mimetype = (mimetypeItem) ? mimetypeItem.mimetype : undefined;
		if (mimetype) {
			const idref = '';
			const href = file;
			toc.push({
				idref,
				href: path.normalize(href),
				mimetype
			});
		}
	}

	if (!toc || toc.length === 0) {
		logger.warn('getCbzTableOfContentsByEntries: Nie udało się odczytać spisu treści (książka=[' + fileName + ']).');
	}

	return toc;
};

/*
const getCbzTableOfContents = async (fileName, fileDir) => {
	const toc = [];

	const mimetypes = [
		{ ext: '.bmp', mimetype: 'image/bmp' },
		{ ext: '.gif', mimetype: 'image/gif' },
		{ ext: '.jpg', mimetype: 'image/jpeg' },
		{ ext: '.jpeg', mimetype: 'image/jpeg' },
		{ ext: '.png', mimetype: 'image/png' },
		{ ext: '.tif', mimetype: 'image/tiff' },
		{ ext: '.tiff', mimetype: 'image/tiff' }
	];

	let files = await fileUtils.getListOfFiles(fileDir, true);
	files = files.sort();

	for (const file of files) {
		const ext = path.parse(file).ext.toLowerCase();
		const mimetypeItem = mimetypes.find(element => element.ext === ext);
		const mimetype = (mimetypeItem) ? mimetypeItem.mimetype : undefined;
		if (mimetype) {
			const idref = '';
			const href = file;
			toc.push({
				idref,
				href: path.normalize(href),
				mimetype
			});
		}
	}

	return toc;
};
*/

module.exports = {
	getCbzInfo: getCbzInfo,
	prepareBookToRead: prepareBookToRead,
	getCbzPageContent: getCbzPageContent
};
