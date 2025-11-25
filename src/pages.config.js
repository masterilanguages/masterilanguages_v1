import Practice from './pages/Practice';
import Progress from './pages/Progress';
import Library from './pages/Library';
import Videos from './pages/Videos';
import Pictures from './pages/Pictures';
import PicturesLesson2 from './pages/PicturesLesson2';
import WordBank from './pages/WordBank';
import WordsIKnow from './pages/WordsIKnow';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Practice": Practice,
    "Progress": Progress,
    "Library": Library,
    "Videos": Videos,
    "Pictures": Pictures,
    "PicturesLesson2": PicturesLesson2,
    "WordBank": WordBank,
    "WordsIKnow": WordsIKnow,
}

export const pagesConfig = {
    mainPage: "Practice",
    Pages: PAGES,
    Layout: __Layout,
};