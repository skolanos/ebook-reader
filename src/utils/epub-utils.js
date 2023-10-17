const fs = require('node:fs');
const path = require('node:path');
const { v4: uuidv4 } = require('uuid');
const xml2js = require('xml2js');
const AdmZip = require('adm-zip');

const logger = require('./logger');
const fileUtils = require('./file-utils');

/**
 *
 * @param {*} options
 * @param {string} fileName
 * @param {string} fileDir
 * @returns
 */
const getEpubInfo = async (options, fileName, fileDir) => {
	const containerXmlPath = path.join(fileDir, '/META-INF/container.xml');
	fileUtils.compareFilePathToMainDir(containerXmlPath, options.unzip_dir);
	const containerXml = await fs.promises.readFile(containerXmlPath);
	const containerObj = await xml2js.parseStringPromise(containerXml);
	const rootfile = containerObj.container.rootfiles[0].rootfile[0].$['full-path'];
	const fullPathToRootfile = path.join(fileDir, rootfile);
	fileUtils.compareFilePathToMainDir(fullPathToRootfile, options.unzip_dir);
	const rootfileXml = await fs.promises.readFile(fullPathToRootfile);
	const rootfileObj = await xml2js.parseStringPromise(rootfileXml);
	const title = rootfileObj.package.metadata[0]['dc:title'][0];
	const creator = rootfileObj.package.metadata[0]['dc:creator'][0]._;
	// pobranie informacji o okładce (ustalenie ścieżki do pliku okładki)
	const metaNode = rootfileObj.package.metadata[0].meta.find(element => element.$.name === 'cover');
	const coverId = (metaNode) ? metaNode.$.content : '';
	let cover = '';
	if (coverId !== '') {
		const itemNode = rootfileObj.package.manifest[0].item.find(element => element.$.id === coverId);
		cover = (itemNode) ? itemNode.$.href : '';
	}

	// pobranie spisu treści
	const toc = await getEpubTableOfContents(fileName, fileDir);

	return {
		uid: uuidv4(),
		file_path: fileName,
		mimetype: 'application/epub+zip',
		title,
		creator,
		cover,
		cover_root_dir_src: path.parse(fullPathToRootfile).dir,
		toc
	};
};

/**
 *
 * @param {string} fileName
 * @param {string} fileDir
 * @returns
 */
const getEpubTableOfContents = async (fileName, fileDir) => {
	const containerXml = await fs.promises.readFile(path.join(fileDir, '/META-INF/container.xml'));
	const containerObj = await xml2js.parseStringPromise(containerXml);
	const rootfile = containerObj.container.rootfiles[0].rootfile[0].$['full-path'];
	const fullPathToRootfile = path.join(fileDir, rootfile);
	const fullPathToOebpsDir = path.parse(fullPathToRootfile).dir;
	const rootfileXml = await fs.promises.readFile(fullPathToRootfile);
	const rootfileObj = await xml2js.parseStringPromise(rootfileXml);

	const toc = [];
	const spineNode = rootfileObj.package.spine.find((element) => element.$.toc.indexOf('ncx') >= 0);
	if (spineNode) {
		for (const itemref of spineNode.itemref) {
			const idref = itemref.$.idref;
			const itemNode = rootfileObj.package.manifest[0].item.find((element) => element.$.id === idref);
			const href = (itemNode) ? path.join(fullPathToOebpsDir, itemNode.$.href) : '';
			const mimetype = (itemNode) ? itemNode.$['media-type'] : '';
			if (href !== '') {
				toc.push({
					idref,
					href: path.normalize(href),
					mimetype
				});
			}
		}
	}

	if (!toc || toc.length === 0) {
		logger.warn('getEpubTableOfContents: Nie udało się odczytać spisu treści (książka=[' + fileName + ']).');
	}

	return toc;
};

/**
 *
 * @param {*} options
 * @param {*} paths
 * @returns
 */
const prepareBooksTitles = async (options, paths) => {
	// wyczyszczenie zawartości katalogu przechowującego okładki książek
	await fs.promises.rm(options.covers_dir, { recursive: true });
	await fs.promises.mkdir(options.covers_dir);

	const entries = [];
	for (const filePath of paths) {
		if (/\.epub$/i.test(filePath)) {
			// plik w formacie EPUB

			// wyczyszczenie zawartości katalogu przechowującego rozkompresowane pliki z książki
			await fs.promises.rm(options.unzip_dir, { recursive: true });
			await fs.promises.mkdir(options.unzip_dir);

			// rozkompresowanie zawartości pliku do katalogu tymczasowego
			const zip = new AdmZip(filePath);
			zip.extractAllTo(options.unzip_dir);

			const entry = await getEpubInfo(options, filePath, options.unzip_dir);

			const coverFilePathSrc = path.join(entry.cover_root_dir_src, entry.cover);
			const coverFileNameDest = path.parse(filePath).name + '-cover' + path.parse(coverFilePathSrc).ext;
			const coverFilePath = path.join(options.covers_dir, coverFileNameDest);
			fileUtils.compareFilePathToMainDir(coverFilePathSrc, options.unzip_dir);
			fileUtils.compareFilePathToMainDir(coverFilePath, options.covers_dir);
			await fs.promises.copyFile(coverFilePathSrc, coverFilePath);

			entries.push({
				uid: entry.uid,
				file_path: entry.file_path,
				mimetype: entry.mimetype,
				title: entry.title,
				creator: entry.creator,
				cover_file_path: coverFilePath,
				toc: entry.toc,
				current_page_idx: 0
			});
		}
	}

	return entries;
};

const prepareLibraryPageHtml = (options, entries) => {
	const res = [];

	res.push('<?xml version="1.0" encoding="utf-8" standalone="no"?>');
	res.push('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">');
	res.push('');
	res.push('<html xmlns="http://www.w3.org/1999/xhtml">');
	res.push('<head>');
	res.push('</head>');
	res.push('');
	res.push('<body>');
	for (const entry of entries) {
		res.push(`  <div class="library-item" data-uid="${entry.uid}">`);
		res.push('    <a href="#">');
		res.push('      <div class="cover">');
		res.push(`        <img src="file:///${entry.cover_file_path}"/>`);
		res.push('      </div>');
		res.push(`      <div class="author">${entry.creator}</div>`);
		res.push(`      <div class="title">${entry.title}</div>`);
		res.push('    </a>');
		res.push('  </div>');
	}
	res.push('</body>');
	res.push('</html>');

	return res.join('\r\n');
};

const prepareBookToRead = async (options, bookInfo) => {
	// wyczyszczenie zawartości katalogu przechowującego rozkompresowane pliki z książki
	await fs.promises.rm(options.unzip_dir, { recursive: true });
	await fs.promises.mkdir(options.unzip_dir);

	// rozkompresowanie zawartości pliku do katalogu tymczasowego
	const zip = new AdmZip(bookInfo.file_path);
	zip.extractAllTo(options.unzip_dir);

	bookInfo.current_page_idx = 0; // TODO: tego nie powinno się ustawiać na 0 bo zaczyna się czytać za każdym razem od początku
	const html = await getEpubPageContent(options, bookInfo);

	// logger.debug('prepareBookToRead: html=[' + html + ']');

	return html;
};

const getEpubPageContent = async (options, bookInfo) => {
	const filePath = bookInfo.toc[bookInfo.current_page_idx].href;
	fileUtils.compareFilePathToMainDir(filePath, options.unzip_dir);
	let html = await fs.promises.readFile(filePath, { encoding: 'utf-8' });

	html = getBodyContent(html);
	html = replaceSrcPaths(options, html, filePath);
	// TODO: zmienić atrybuty src w zależności od tego czy są to śeiżki względne czy prowadzą do strony zewnętrznej (te otwierać w nowym oknie przeglądarki)

	// logger.debug('getEpubPageContent: html=[' + html + ']');

	return html;
};

/**
 *
 * @param {string} html
 * @returns {string}
 */
const getBodyContent = (html) => {
	let res = html;

	// pobranie tylko zawartości pomiędzy tagami BODY
	if (html !== '') {
		let regExpExecArray = null;
		let regex = /<\s*body/gi;
		regExpExecArray = regex.exec(res);
		if (regExpExecArray) {
			res = res.substring(regExpExecArray.index, res.length);
			const idx = res.indexOf('>');
			res = res.substring(idx + 1, res.length);
			regex = /<\s*\/\s*body/gi;
			regExpExecArray = regex.exec(res);
			if (regExpExecArray) {
				res = res.substring(0, regExpExecArray.index);
			}
		}
		res = res.trim();
	}

	return res;
};

/**
 *
 * @param {*} options
 * @param {string} html
 * @param {string} filePath
 * @returns {string}
 */
const replaceSrcPaths = (options, html, filePath) => {
	let res = html;

	// logger.debug('replaceSrcPaths: file_path=[' + filePath + ']');
	if (html !== '') {
		// znalezienie wszystkich ciągów src="...", zmiana ścieżki na bezwzględną
		const matches = [];
		const regex = /src="[a-zA-Z0-9_./\-\s]*"/gi;
		let regexResultArray = null;
		while ((regexResultArray = regex.exec(res)) !== null) {
			matches.push(regexResultArray[0]);
		}
		if (matches.length > 0) {
			const dirPath = path.parse(filePath).dir;
			for (let i = 0; i < matches.length; i++) {
				const href = matches[i];
				// logger.debug('replaceSrcPaths: href=[' + href + ']');
				const idx = href.indexOf('"');
				const hrefPath = path.join(dirPath, href.substring(idx + 1, href.length - 1));
				// logger.debug('replaceSrcPaths: hrefPath=[' + hrefPath + ']');
				fileUtils.compareFilePathToMainDir(hrefPath, options.unzip_dir);
				if (!fs.existsSync(hrefPath)) {
					logger.warn('replaceSrcPaths: ścieżka nie istnieje path=[' + hrefPath + ']');
				}
				const regexptoreplace = new RegExp(href, 'gi');
				res = res.replace(regexptoreplace, 'src="file:///' + hrefPath + '"');
			}
		}
		// logger.debug('replaceSrcPaths: html=[' + html + ']');
	}

	return res;
};

module.exports = {
	prepareBooksTitles: prepareBooksTitles,
	prepareLibraryPageHtml: prepareLibraryPageHtml,
	prepareBookToRead: prepareBookToRead,
	getEpubPageContent: getEpubPageContent
};
