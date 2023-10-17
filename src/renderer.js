const appState = {
	librarySelected: false,
	bookSelected: false,
	currentPage: 0,
	totalPages: 0
};

document.addEventListener('DOMContentLoaded', () => {
	setUiState();

	document.querySelector('#directory-selector').addEventListener('click', async () => {
		const res = await window.electronApi.selectDirectory();
		if (!res.path.canceled) {
			appState.librarySelected = true;
			setUiState();
			document.querySelector('.main-content').innerHTML = res.content;
			// podłączenie zdarzenia onClick na kliknięcie na okładkę książki
			const elements = document.querySelectorAll('.library-item');
			for (const element of elements) {
				element.addEventListener('click', (event) => {
					event.preventDefault();

					const elm = getParentElementByClass('library-item', event.target);
					if (elm) {
						const uid = elm.getAttribute('data-uid');
						libraryBookClick(uid);
					}
				});
			}
		}
	});
	document.querySelector('#prev-page').addEventListener('click', async () => {
		const res = await window.electronApi.getBookPrevPage();
		if (res) {
			document.querySelector('.main-content').innerHTML = '<article class="book-content">' + res.content + '</article>';
			appState.currentPage = res.currentPage;
			appState.totalPages = res.totalPages;
			showReadingProgress(res);
			setUiState();
		}

		console.log('prevPageClick', res); // DEBUG: >>>>>>>>>>>>>>>>>>>>>>>>>>>
	});
	document.querySelector('#next-page').addEventListener('click', async () => {
		const res = await window.electronApi.getBookNextPage();
		if (res) {
			document.querySelector('.main-content').innerHTML = '<article class="book-content">' + res.content + '</article>';
			appState.currentPage = res.currentPage;
			appState.totalPages = res.totalPages;
			showReadingProgress(res);
			setUiState();
		}

		console.log('nextPageClick', res); // DEBUG: >>>>>>>>>>>>>>>>>>>>>>>>>>>
	});
});

const setUiState = () => {
	document.querySelector('#prev-page').style.display = 'none';
	document.querySelector('#next-page').style.display = 'none';

	if (appState.bookSelected) {
		document.querySelector('#prev-page').style.display = 'inline';
		document.querySelector('#next-page').style.display = 'inline';
		document.querySelector('#prev-page').disabled = (appState.currentPage <= 1);
		document.querySelector('#next-page').disabled = (appState.currentPage >= appState.totalPages);
	}
};

const getParentElementByClass = (className, element) => {
	let target = element;
	while (target && target.className !== className) {
		target = target.parentElement;
	}

	return target;
};

const showReadingProgress = (response) => {
	document.querySelector('#book-progress').innerHTML = `strona: ${response.currentPage} z ${response.totalPages}`;
};

const libraryBookClick = async (bookUid) => {
	appState.bookSelected = true;
	const res = await window.electronApi.prepareBookToRead(bookUid);
	document.querySelector('.main-content').innerHTML = res.content;
	appState.currentPage = res.currentPage;
	appState.totalPages = res.totalPages;
	showReadingProgress(res);
	setUiState();

	console.log('libraryBookClick', res); // DEBUG: >>>>>>>>>>>>>>>>>>>>>>>>>>>>
};
