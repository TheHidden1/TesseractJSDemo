const { TesseractWorker, utils: { loadLang }, OEM, PSM, } = Tesseract;
detectionOptions = {
	tessedit_ocr_engine_mode: OEM.TESSERACT_LSTM_COMBINED,
	// tessedit_ocr_engine_mode: OEM.LSTM_ONLY,
	// tessedit_ocr_engine_mode: OEM.TESSERACT_LSTM_COMBINED,
	// tessedit_pageseg_mode: PSM.SPARSE_TEXT_OSD,
	tessedit_create_hocr: "0",
	tessedit_create_tsv: "0",
	tessedit_create_unlv: "0",
	tessedit_create_osd: "0",
};

const worker = new TesseractWorker();
const language = "fra";

const TotalkeyWords = [
	{ key: "Total TTC", multiplier: 0.1 },
	{ key: "Total", multiplier: 0.9 },
	{ key: "sous-total", multiplier: 0.5 },
	{ key: "TTC", multiplier: 0.9 },
	{ key: "Solde", multiplier: 0.9 },
	{ key: "Montant", multiplier: 0.8 },
];
const NumFacturekeyWords = [{ key: "Facture n°", multiplier: 1 }, { key: "Facture", multiplier: 0.9 }, { key: "n°", multiplier: 0.5 }];

const numberRegex = /[+-]?\d+(?:\.\d+)?/;
const numFactureRegex = /[+-]?\d+(?:\/[.,]\d+)?/;

const input = document.getElementById("preview_img");
input.onload = setUpOverlay;
const input_overlay = document.getElementById("preview_overlay");
const ctx = input_overlay.getContext("2d");
const progressBar = document.getElementById("progress-bar");
const progressBarStatus = document.getElementById("progress-bar-status-text");
const statusWrapper = document.getElementById("status-wrapper");
const ocrOutput = document.getElementById("hocr_out");

let tStart = 0;
let tEnd = 0;

function scanDocument() {
	if (input.naturalWidth <= 0 || input.naturalHeight <= 0) {
		alert("Please select a valid image ", "danger");
		return;
	}
	startTimer();
	worker
		.recognize(input, language, detectionOptions)
		.progress(updateProgress)
		.then(handleResult)
		.catch(console.error);
}

function handleResult(res) {
	endTimer();
	console.log(res);
	clearCanvas();
	res.words.forEach(function (word) {
		drawBox(word, ctx);
	});
	alert(`Success ! took ${tEnd - tStart} Ms`, "success");
	ocrOutput.innerHTML = res.hocr;
	showDocumentInfo(res);
}

function startTimer() {
	tStart = performance.now();
}

function endTimer() {
	tEnd = performance.now();
}

function readURL(imageInput) {
	const file = imageInput.files[0];
	const reader = new FileReader();
	reader.onload = function (e) {
		input.src = e.target.result;
	};
	reader.readAsDataURL(file);
}

function setUpOverlay() {
	input_overlay.width = input.naturalWidth;
	input_overlay.height = input.naturalHeight;
}
function clearCanvas() {
	ctx.clearRect(0, 0, input_overlay.width, input_overlay.height);
}

function drawBox(word, ctx) {
	var b = word.bbox;
	ctx.strokeWidth = 2;
	ctx.strokeStyle = "red";
	ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
	ctx.beginPath();
	ctx.moveTo(word.baseline.x0, word.baseline.y0);
	ctx.lineTo(word.baseline.x1, word.baseline.y1);
	ctx.strokeStyle = "green";
	ctx.stroke();
}

function updateProgress(progress) {
	const progressPercent = Math.floor(progress.progress * 100);
	progressBar.style.width = `${progressPercent}%`;
	progressBarStatus.innerHTML = `${progress.status} : ${progressPercent}%`;
}

function alert(txt, type) {
	scrollTop();
	statusWrapper.classList.forEach(className => {
		if (className.startsWith("alert-")) {
			statusWrapper.classList.remove(className);
		}
		if (className.startsWith("border-")) {
			statusWrapper.classList.remove(className);
		}
	});
	statusWrapper.classList.remove("d-none");
	statusWrapper.classList.add(`alert-${type}`);
	statusWrapper.classList.add(`border-${type}`);
	statusWrapper.innerHTML = txt;
}
function scrollTop() {
	document.body.scrollTop = 0; // For Safari
	document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
}

function showDocumentInfo(result) {
	const totalSuggestions = getValuesFromKeywords(result, TotalkeyWords, 0.5);
	if (totalSuggestions.length > 0) {
		// parse total numbers
		totalSuggestions.forEach(suggestion => {
			let match = numberRegex.exec(suggestion.text);
			if (match) {
				suggestion.data = parseFloat(match[0]);
			}
		});
		setFormVariables("total", totalSuggestions);
	}
	const factureSuggestions = getValuesFromKeywords(result, NumFacturekeyWords, 0.5);
	console.log(factureSuggestions);
	if (factureSuggestions.length > 0) {
		// parse total numbers
		factureSuggestions.forEach(suggestion => {
			let match = numFactureRegex.exec(suggestion.text);
			if (match) {
				suggestion.data = parseFloat(match[0]);
			}
		});
		setFormVariables("num-facture", factureSuggestions);
	}
}
function setFormVariables(namePrefix, values) {
	const wrap = document.getElementById(`${namePrefix}-input-wrap`);
	wrap.classList.remove("d-none");
	const formInput = document.getElementById(`${namePrefix}-input`);
	formInput.value = values[0].data;
	const maxlen = values.length < 4 ? values.length : 4;
	for (let i = 0; i < maxlen; i++) {
		const formInputHelp = document.getElementById(`${namePrefix}-help${i}`);
		formInputHelp.innerHTML = `${values[i].text} : ${Math.floor(values[i].confidence)}%`;
	}
}

function getValuesFromKeywords(result, keyWords, minConfidenceScore = 0.5) {
	out = [];
	result.lines.forEach(line => {
		// console.log(line.text)
		keyWords.forEach(keyword => {
			if (line.text.includes(keyword.key) || line.text.includes(keyword.key.toUpperCase()) || line.text.includes(keyword.key.toLowerCase())) {
				if (line.confidence >= minConfidenceScore) {
					out.push({ text: line.text, confidence: line.confidence * keyword.multiplier });
				}
			}
		});
	});
	return out.sort((a, b) => {
		return b.confidence - a.confidence;
	});
}

document.getElementById('app-wrap').addEventListener('drop', (e) => {
	debugger
	e.preventDefault();
	e.stopPropagation();
	console.log("droped")
})
