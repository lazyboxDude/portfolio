// CV page: language switch and "Save as PDF".
// The CV is plain HTML, one <article class="cv"> per language (see cv.html). Without JS the language
// switch works through :target in css/cv.css. With JS the language is also picked from the browser
// when the address has no #language, and the print button appears (the browser's print dialog saves
// the sheet as a PDF, so no PDF file has to be hosted).

const articles = [...document.querySelectorAll('.cv')];
const links = [...document.querySelectorAll('.cv-langs a')];
const printButton = document.getElementById('print');

const languages = articles.map((a) => a.id);

/** The language to show: the one in the address, else the browser's first known one, else the first. */
function pick() {
    const fromHash = location.hash.slice(1);
    if (languages.includes(fromHash)) return fromHash;
    const preferred = (navigator.languages?.length ? navigator.languages : [navigator.language])
        .map((l) => String(l).slice(0, 2).toLowerCase())
        .find((l) => languages.includes(l));
    return preferred ?? languages[0];
}

function show() {
    const lang = pick();
    for (const article of articles) {
        const active = article.id === lang;
        article.classList.toggle('is-active', active);
        if (active) {
            document.documentElement.lang = lang;
            // The page title becomes the suggested file name of the PDF.
            document.title = article.dataset.title ?? document.title;
        }
    }
    for (const link of links) {
        link.setAttribute('aria-current', String(link.hash === `#${lang}`));
    }
}

show();
window.addEventListener('hashchange', show);

printButton.hidden = false;
printButton.addEventListener('click', () => window.print());
