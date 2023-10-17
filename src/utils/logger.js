class Logger {
	constructor () {
		// poziomy logowania - logowane jest wszystko co ma wyższy (lub równy)
		// poziom od aktualnie ustawionego poziomu
		this.LVL_ALL = 0;
		this.LVL_DEBUG = 1;
		this.LVL_INFO = 2;
		this.LVL_WARN = 3;
		this.LVL_ERROR = 4;
		this.LVL_FATAL = 5;
		this.LVL_OFF = 6;
		this.currentLogLvl = this.LVL_ALL;

		// definicja kolorów
		this.blackStart = '\x1b[30m';
		this.redStart = '\x1b[31m';
		this.greenStart = '\x1b[32m';
		this.yellowStart = '\x1b[33m';
		this.blueStart = '\x1b[34m';
		this.magentaStart = '\x1b[35m';
		this.cyanStart = '\x1b[36m';
		this.whiteStart = '\x1b[37m';

		this.colorEnd = '\x1b[0m';
	}

	setCurrentLogLvl (logLvl) {
		this.currentLogLvl = logLvl;
	}

	debug (text) {
		if (this.LVL_DEBUG >= this.currentLogLvl) {
			const dateTime = new Date().toISOString().replace(/T/g, ' ').replace(/Z/g, '');
			console.log(`${this.yellowStart}${dateTime}${this.colorEnd} ${this.cyanStart}DEBUG${this.colorEnd} ${text}`);
		}
	}

	info (text) {
		if (this.LVL_INFO >= this.currentLogLvl) {
			const dateTime = new Date().toISOString().replace(/T/g, ' ').replace(/Z/g, '');
			console.log(`${this.yellowStart}${dateTime}${this.colorEnd} ${this.greenStart}INFO${this.colorEnd} ${text}`);
		}
	}

	warn (text) {
		if (this.LVL_WARN >= this.currentLogLvl) {
			const dateTime = new Date().toISOString().replace(/T/g, ' ').replace(/Z/g, '');
			console.log(`${this.yellowStart}${dateTime}${this.colorEnd} ${this.yellowStart}WARN${this.colorEnd} ${text}`);
		}
	}

	error (text) {
		if (this.LVL_ERROR >= this.currentLogLvl) {
			const dateTime = new Date().toISOString().replace(/T/g, ' ').replace(/Z/g, '');
			console.log(`${this.yellowStart}${dateTime}${this.colorEnd} ${this.redStart}ERROR${this.colorEnd} ${text}`);
		}
	}
}

module.exports = new Logger();
