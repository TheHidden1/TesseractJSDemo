const {
	TesseractWorker,
	utils: { loadLang },
} = Tesseract;
// console.log(Tesseract)
// Tesseract.workerOptions.langPath = "https://tessdata.projectnaptha.com/4.0.0";
// Tesseract.workerOptions.corePath = "./Tesseract/core.wasm.js";
// Tesseract.workerOptions.workerPath = "./Tesseract/worker.min.js";

const worker = new TesseractWorker();
let language = "fra";
// console.log(worker.options)

const input = document.getElementById("preview_img");
input.onload = setUpOverlay;
const input_overlay = document.getElementById("preview_overlay");
const ctx = input_overlay.getContext("2d");
const progressBar = document.getElementById("progress-bar");
const progressBarStatus = document.getElementById("progress-bar-status-text");
const statusWrapper = document.getElementById("status-wrapper");
const documentInfoWrapper = document.getElementById("info-form-wrapper");

let tStart = 0;
let tEnd = 0;

function startTimer() {
	tStart = performance.now();
}

function endTimer() {
	tEnd = performance.now();
}

function readURL(imageInput) {
	const file = imageInput.files[0];
	const reader = new FileReader();
	reader.onload = function(e) {
		input.src = e.target.result;
	};
	reader.readAsDataURL(file);
}

function scanDocument() {
	// image check
	console.dir(input);
	if (input.naturalWidth <= 0 || input.naturalHeight <= 0) {
		alert("Please select a valid image ", "alert-danger");
		return;
	}

	// then
	startTimer();
	worker
		.recognize(input, language)
		.progress(updateProgress)
		.then(handleResult)
		.catch(err => {
			console.log("info ", err);
		});
}

function setUpOverlay() {
	input_overlay.width = input.naturalWidth;
	input_overlay.height = input.naturalHeight;
}
function handleResult(res) {
	endTimer();
	clearCanvas();
	res.words.forEach(function(word) {
		drawBox(word, ctx);
	});
	alert(`Success ! took ${tEnd - tStart} Ms`, "alert-success");
	showDocumentInfo(res);
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
	});
	statusWrapper.classList.remove("d-none");
	statusWrapper.classList.add(type);
	statusWrapper.innerHTML = txt;
}
function scrollTop() {
	document.body.scrollTop = 0; // For Safari
	document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
}

function showDocumentInfo(result) {
	documentInfoWrapper.classList.remove("d-none");
}
