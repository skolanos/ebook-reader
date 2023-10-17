const fs = require('node:fs');
const path = require('node:path');

const logger = require('./logger');

/**
 * Funkcja zwraca listę pełnych ścieżek plików (tylko plików, bez katalogów)
 * znajdujących się w katalogu.
 *
 * @param {string} directoryPath ścieżka do katalogu
 * @param {boolean} recursive czy pobierać pliki rekurencyjnie z podkatalogów
 *
 * @returns {Promise<Array<String>>} tablica ścieżek plików znajdujących się w katalogu
 */
const getListOfFiles = async (directoryPath, recursive) => {
	// logger.info('getListOfFiles: directoryPath=[' + directoryPath + '], recursive=[' + recursive + ']');
	/** @type {Array<string>} */
	let files = [];
	const entries = await fs.promises.readdir(path.normalize(directoryPath));
	for (const entry of entries) {
		const fullPath = path.join(directoryPath, entry);
		const stat = await fs.promises.stat(fullPath);

		if (stat.isDirectory()) {
			if (recursive) {
				const innerFiles = await getListOfFiles(fullPath, recursive);
				files = [...files, ...innerFiles];
			}
		} else if (stat.isFile()) {
			files.push(fullPath);
		}
	}
	return files;
};

/**
 * Procedura sprawdza czy ścieżka do pliku wychodzi z katalogu "głównego", jeżeli
 * tak to zgłaszany jest wyjśtek.
 *
 * @param {string} pathToCheck ścieżka do pliku
 * @param {string} pathMain ścieżka do katalogu "głównego"
 */
const compareFilePathToMainDir = (pathToCheck, pathMain) => {
	// logger.info('compareFilePathToMainDir: pathToCheck=[' + pathToCheck + '], pathMain=[' + pathMain + ']');
	// ścieżka nie może wyjść z katalogu "głównego" - ścieżka musi zaczynać się od katalogu "głównego"
	const pathMainNormalize = path.normalize(pathMain);
	const pathToCheckNormalize = path.normalize(pathToCheck);

	if (pathToCheckNormalize.indexOf(pathMainNormalize) !== 0) {
		logger.error('compareFilePathToMainDir: Nastąpiłoby wyjście poza katalog roboczy: pathToCheck=[' + pathToCheck + '], pathMain=[' + pathMain + ']');
		throw new Error('Nastąpiłoby wyjście poza katalog roboczy.');
	}
};

module.exports = {
	getListOfFiles: getListOfFiles,
	compareFilePathToMainDir: compareFilePathToMainDir
};
