/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AvatarSelect from './pages/AvatarSelect';
import BabyVideos from './pages/BabyVideos';
import Backpack from './pages/Backpack';
import BodyPartsLesson from './pages/BodyPartsLesson';
import ColorsLesson from './pages/ColorsLesson';
import ColorsTest from './pages/ColorsTest';
import Days from './pages/Days';
import DaysLesson from './pages/DaysLesson';
import Flashcards from './pages/Flashcards';
import Home from './pages/Home';
import Journal from './pages/Journal';
import LanguageSelect from './pages/LanguageSelect';
import Level1World from './pages/Level1World';
import ManageCoaches from './pages/ManageCoaches';
import MediaLibrary from './pages/MediaLibrary';
import MonthsLesson from './pages/MonthsLesson';
import MyProgram from './pages/MyProgram';
import Pictures from './pages/Pictures';
import PicturesLesson2 from './pages/PicturesLesson2';
import Progress from './pages/Progress';
import Sentences from './pages/Sentences';
import Songs from './pages/Songs';
import Store from './pages/Store';
import StoryLearning from './pages/StoryLearning';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AvatarSelect": AvatarSelect,
    "BabyVideos": BabyVideos,
    "Backpack": Backpack,
    "BodyPartsLesson": BodyPartsLesson,
    "ColorsLesson": ColorsLesson,
    "ColorsTest": ColorsTest,
    "Days": Days,
    "DaysLesson": DaysLesson,
    "Flashcards": Flashcards,
    "Home": Home,
    "Journal": Journal,
    "LanguageSelect": LanguageSelect,
    "Level1World": Level1World,
    "ManageCoaches": ManageCoaches,
    "MediaLibrary": MediaLibrary,
    "MonthsLesson": MonthsLesson,
    "MyProgram": MyProgram,
    "Pictures": Pictures,
    "PicturesLesson2": PicturesLesson2,
    "Progress": Progress,
    "Sentences": Sentences,
    "Songs": Songs,
    "Store": Store,
    "StoryLearning": StoryLearning,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};