import Practice from './pages/Practice';
import Progress from './pages/Progress';
import Videos from './pages/Videos';
import Pictures from './pages/Pictures';
import PicturesLesson2 from './pages/PicturesLesson2';
import Sentences from './pages/Sentences';
import ColorsLesson from './pages/ColorsLesson';
import BodyPartsLesson from './pages/BodyPartsLesson';
import DaysLesson from './pages/DaysLesson';
import MonthsLesson from './pages/MonthsLesson';
import ColorsTest from './pages/ColorsTest';
import Home from './pages/Home';
import Store from './pages/Store';
import Activities from './pages/Activities';
import AvatarSelect from './pages/AvatarSelect';
import BabyVideos from './pages/BabyVideos';
import Backpack from './pages/Backpack';
import Level1World from './pages/Level1World';
import StoryLearning from './pages/StoryLearning';
import Journal from './pages/Journal';
import Songs from './pages/Songs';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Practice": Practice,
    "Progress": Progress,
    "Videos": Videos,
    "Pictures": Pictures,
    "PicturesLesson2": PicturesLesson2,
    "Sentences": Sentences,
    "ColorsLesson": ColorsLesson,
    "BodyPartsLesson": BodyPartsLesson,
    "DaysLesson": DaysLesson,
    "MonthsLesson": MonthsLesson,
    "ColorsTest": ColorsTest,
    "Home": Home,
    "Store": Store,
    "Activities": Activities,
    "AvatarSelect": AvatarSelect,
    "BabyVideos": BabyVideos,
    "Backpack": Backpack,
    "Level1World": Level1World,
    "StoryLearning": StoryLearning,
    "Journal": Journal,
    "Songs": Songs,
}

export const pagesConfig = {
    mainPage: "Practice",
    Pages: PAGES,
    Layout: __Layout,
};