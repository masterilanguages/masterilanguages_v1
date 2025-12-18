import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ArrowLeft, Coins, Check, Backpack, Volume2, Star, BookOpen, Plus, ChevronRight, Loader2, FileText, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Input } from "@/components/ui/input";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import GameHeader from "../components/game/GameHeader";
import ClickableWord from "../components/learning/ClickableWord";
import TranslatorWidget from "../components/TranslatorWidget";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import VideoTranscript from "../components/video/VideoTranscript";
import EditableWord from "../components/learning/EditableWord";
import VideoAdminControls from "../components/admin/VideoAdminControls";

// Videos with transcripts - Piece of Hebrew channel
const level1Videos = [
  { 
    id: 1, 
    title: "Learn Hebrew Every Day - הַרְגָלִים", 
    thumbnail: "https://img.youtube.com/vi/n8XvkVp6CfQ/maxresdefault.jpg",
    youtubeId: "n8XvkVp6CfQ",
    duration: "13:07", 
    coins: 75,
    category: "Daily Habits",
    transcript: [
      { hebrew: "הֶרְגֵּל", transliteration: "Hergel", meaning: "Habit", time: "0:30" },
      { hebrew: "לִלְמוֹד", transliteration: "Lilmod", meaning: "To learn", time: "1:00" },
      { hebrew: "כָּל יוֹם", transliteration: "Kol yom", meaning: "Every day", time: "1:30" },
      { hebrew: "עָסוּק", transliteration: "Asuk", meaning: "Busy", time: "2:00" },
      { hebrew: "זְמַן", transliteration: "Zman", meaning: "Time", time: "2:30" },
      { hebrew: "דַּקָּה", transliteration: "Daka", meaning: "Minute", time: "3:00" },
      { hebrew: "קָשֶׁה", transliteration: "Kashe", meaning: "Hard/Difficult", time: "3:30" },
      { hebrew: "קַל", transliteration: "Kal", meaning: "Easy", time: "4:00" },
      { hebrew: "לְהִתְחִיל", transliteration: "Lehatchil", meaning: "To start", time: "4:30" },
      { hebrew: "לְהַמְשִׁיךְ", transliteration: "Lehamshich", meaning: "To continue", time: "5:00" },
      { hebrew: "לֹא לְוַתֵּר", transliteration: "Lo levater", meaning: "Don't give up", time: "5:30" },
      { hebrew: "הַצְלָחָה", transliteration: "Hatzlacha", meaning: "Success", time: "6:00" },
      { hebrew: "לְתַרְגֵּל", transliteration: "Letargel", meaning: "To practice", time: "6:30" },
      { hebrew: "עִבְרִית", transliteration: "Ivrit", meaning: "Hebrew", time: "7:00" },
      { hebrew: "לְדַבֵּר", transliteration: "Ledaber", meaning: "To speak", time: "7:30" },
      { hebrew: "לִקְרוֹא", transliteration: "Likro", meaning: "To read", time: "8:00" },
      { hebrew: "לִכְתּוֹב", transliteration: "Lichtov", meaning: "To write", time: "8:30" },
      { hebrew: "לִשְׁמוֹעַ", transliteration: "Lishmoa", meaning: "To listen", time: "9:00" },
    ],
    exercises: [
      {
        type: "multiple_choice",
        question: "What does 'הֶרְגֵּל' (Hergel) mean?",
        options: ["Time", "Habit", "Day", "Easy"],
        correct: 1
      },
      {
        type: "multiple_choice",
        question: "How do you say 'every day' in Hebrew?",
        options: ["Kol yom", "Zman", "Daka", "Kashe"],
        correct: 0
      },
      {
        type: "multiple_choice",
        question: "What is the opposite of 'קָשֶׁה' (Kashe - Hard)?",
        options: ["Asuk", "Kal", "Zman", "Hergel"],
        correct: 1
      },
    ]
  },
  { 
    id: 2, 
    title: "Israeli School System 🎒", 
    thumbnail: "https://img.youtube.com/vi/L93zseSWcsg/maxresdefault.jpg",
    youtubeId: "L93zseSWcsg",
    duration: "14:53", 
    coins: 80,
    category: "School",
    transcript: [
      { hebrew: "בֵּית סֵפֶר", transliteration: "Beit sefer", meaning: "School", time: "0:30" },
      { hebrew: "גַּן יְלָדִים", transliteration: "Gan yeladim", meaning: "Kindergarten", time: "1:00" },
      { hebrew: "כִּיתָּה", transliteration: "Kita", meaning: "Class/Grade", time: "1:20" },
      { hebrew: "תִּיכוֹן", transliteration: "Tichon", meaning: "High school", time: "1:30" },
      { hebrew: "יְסוֹדִי", transliteration: "Yesodi", meaning: "Elementary", time: "1:45" },
      { hebrew: "תַּלְמִיד", transliteration: "Talmid", meaning: "Student (m)", time: "2:00" },
      { hebrew: "תַּלְמִידָה", transliteration: "Talmida", meaning: "Student (f)", time: "2:15" },
      { hebrew: "מוֹרֶה", transliteration: "Moreh", meaning: "Teacher (m)", time: "2:30" },
      { hebrew: "מוֹרָה", transliteration: "Mora", meaning: "Teacher (f)", time: "2:45" },
      { hebrew: "שִׁעוּר", transliteration: "Shiur", meaning: "Lesson", time: "3:00" },
      { hebrew: "הַפְסָקָה", transliteration: "Hafsaka", meaning: "Break", time: "3:30" },
      { hebrew: "אֲרוּחַת צָהֳרַיִם", transliteration: "Aruchat tzohorayim", meaning: "Lunch", time: "3:45" },
      { hebrew: "שִׁעוּרֵי בַּיִת", transliteration: "Shiurei bayit", meaning: "Homework", time: "4:00" },
      { hebrew: "מִבְחָן", transliteration: "Mivchan", meaning: "Test/Exam", time: "4:30" },
      { hebrew: "צִיּוּן", transliteration: "Tziun", meaning: "Grade", time: "5:00" },
      { hebrew: "מַנְהָל", transliteration: "Manhal", meaning: "Principal", time: "5:30" },
      { hebrew: "חֲצֵר", transliteration: "Chatzer", meaning: "Yard/Playground", time: "6:00" },
      { hebrew: "סֵפֶר", transliteration: "Sefer", meaning: "Book", time: "6:30" },
      { hebrew: "מַחְבֶּרֶת", transliteration: "Machberet", meaning: "Notebook", time: "7:00" },
      { hebrew: "עִפָּרוֹן", transliteration: "Iparon", meaning: "Pencil", time: "7:30" },
      { hebrew: "תִּיק", transliteration: "Tik", meaning: "Bag/Backpack", time: "8:00" },
      { hebrew: "לוּחַ", transliteration: "Luach", meaning: "Board", time: "8:30" },
      { hebrew: "שֻׁלְחָן", transliteration: "Shulchan", meaning: "Desk/Table", time: "9:00" },
      { hebrew: "כִּסֵּא", transliteration: "Kiseh", meaning: "Chair", time: "9:30" },
    ],
    exercises: [
      {
        type: "multiple_choice",
        question: "What does 'בֵּית סֵפֶר' mean?",
        options: ["House", "School", "Library", "Office"],
        correct: 1
      },
      {
        type: "multiple_choice",
        question: "How do you say 'homework' in Hebrew?",
        options: ["Mivchan", "Shiurei bayit", "Hafsaka", "Tziun"],
        correct: 1
      },
    ]
  },
  { 
    id: 3, 
    title: "Public Transportation 🚌", 
    thumbnail: "https://img.youtube.com/vi/IS11NMk9sW8/maxresdefault.jpg",
    youtubeId: "IS11NMk9sW8",
    duration: "13:44", 
    coins: 70,
    category: "Travel",
    transcript: [
      { hebrew: "אוֹטוֹבּוּס", transliteration: "Otobus", meaning: "Bus", time: "0:30" },
      { hebrew: "רַכֶּבֶת", transliteration: "Rakevet", meaning: "Train", time: "1:00" },
      { hebrew: "רַכֶּבֶת קַלָּה", transliteration: "Rakevet kala", meaning: "Light rail", time: "1:20" },
      { hebrew: "תַּחֲנָה", transliteration: "Tachana", meaning: "Station", time: "1:30" },
      { hebrew: "תַּחֲנָה מֶרְכָּזִית", transliteration: "Tachana merkazit", meaning: "Central station", time: "1:45" },
      { hebrew: "מוֹנִית", transliteration: "Monit", meaning: "Taxi", time: "2:00" },
      { hebrew: "נַהָג", transliteration: "Nahag", meaning: "Driver", time: "2:15" },
      { hebrew: "כַּרְטִיס", transliteration: "Kartis", meaning: "Ticket", time: "2:30" },
      { hebrew: "רַב קַו", transliteration: "Rav kav", meaning: "Bus card", time: "2:45" },
      { hebrew: "נוֹסֵעַ", transliteration: "Nosea", meaning: "Passenger", time: "3:00" },
      { hebrew: "לַעֲלוֹת", transliteration: "La'alot", meaning: "To get on", time: "3:30" },
      { hebrew: "לָרֶדֶת", transliteration: "Laredet", meaning: "To get off", time: "4:00" },
      { hebrew: "עֲצִירָה", transliteration: "Atzira", meaning: "Stop", time: "4:30" },
      { hebrew: "קַו", transliteration: "Kav", meaning: "Line/Route", time: "5:00" },
      { hebrew: "לוּחַ זְמַנִּים", transliteration: "Luach zmanim", meaning: "Schedule", time: "5:30" },
      { hebrew: "אֵיחוּר", transliteration: "Ichur", meaning: "Delay", time: "6:00" },
      { hebrew: "מְהִיר", transliteration: "Mahir", meaning: "Fast", time: "6:30" },
      { hebrew: "אִטִּי", transliteration: "Iti", meaning: "Slow", time: "7:00" },
      { hebrew: "יָשָׁר", transliteration: "Yashar", meaning: "Straight", time: "7:30" },
      { hebrew: "יָמִינָה", transliteration: "Yamina", meaning: "Right", time: "8:00" },
      { hebrew: "שְׂמֹאלָה", transliteration: "Smola", meaning: "Left", time: "8:30" },
      { hebrew: "לְאָן?", transliteration: "Le'an?", meaning: "Where to?", time: "9:00" },
      { hebrew: "כַּמָּה עוֹלֶה?", transliteration: "Kama oleh?", meaning: "How much?", time: "9:30" },
    ],
    exercises: [
      {
        type: "multiple_choice",
        question: "What does 'רַכֶּבֶת' mean?",
        options: ["Bus", "Taxi", "Train", "Plane"],
        correct: 2
      },
      {
        type: "multiple_choice",
        question: "How do you say 'ticket' in Hebrew?",
        options: ["Tachana", "Kartis", "Monit", "Kav"],
        correct: 1
      },
    ]
  },
  { 
    id: 4, 
    title: "Van Life Day in Hebrew 🚐", 
    thumbnail: "https://img.youtube.com/vi/Q2TToSUWbAw/maxresdefault.jpg",
    youtubeId: "Q2TToSUWbAw",
    duration: "9:42", 
    coins: 55,
    category: "Daily Life",
    transcript: [
      { hebrew: "בֹּקֶר", transliteration: "Boker", meaning: "Morning", time: "0:30" },
      { hebrew: "לְהִתְעוֹרֵר", transliteration: "Lehit'orer", meaning: "To wake up", time: "1:00" },
      { hebrew: "קָם", transliteration: "Kam", meaning: "Got up", time: "1:15" },
      { hebrew: "שֵׁינָה", transliteration: "Sheina", meaning: "Sleep", time: "1:30" },
      { hebrew: "לְבַשֵּׁל", transliteration: "Levashel", meaning: "To cook", time: "2:00" },
      { hebrew: "אֹכֶל", transliteration: "Ochel", meaning: "Food", time: "2:15" },
      { hebrew: "אֲרוּחַת בֹּקֶר", transliteration: "Aruchat boker", meaning: "Breakfast", time: "2:30" },
      { hebrew: "קָפֶה", transliteration: "Kafe", meaning: "Coffee", time: "2:45" },
      { hebrew: "עֲבוֹדָה", transliteration: "Avoda", meaning: "Work", time: "3:00" },
      { hebrew: "מַחְשֵׁב", transliteration: "Machshev", meaning: "Computer", time: "3:30" },
      { hebrew: "אִינְטֶרְנֶט", transliteration: "Internet", meaning: "Internet", time: "3:45" },
      { hebrew: "טֶבַע", transliteration: "Teva", meaning: "Nature", time: "4:00" },
      { hebrew: "יָם", transliteration: "Yam", meaning: "Sea", time: "4:15" },
      { hebrew: "הָרִים", transliteration: "Harim", meaning: "Mountains", time: "4:30" },
      { hebrew: "חוֹפֶשׁ", transliteration: "Chofesh", meaning: "Freedom", time: "4:45" },
      { hebrew: "הַרְפַּתְקָה", transliteration: "Harpatka", meaning: "Adventure", time: "5:00" },
      { hebrew: "לָנוּחַ", transliteration: "Lanuach", meaning: "To rest", time: "5:30" },
      { hebrew: "לַיְלָה", transliteration: "Layla", meaning: "Night", time: "6:00" },
      { hebrew: "כּוֹכָבִים", transliteration: "Kochavim", meaning: "Stars", time: "6:30" },
      { hebrew: "יָפֶה", transliteration: "Yafe", meaning: "Beautiful", time: "7:00" },
      { hebrew: "שָׁקֵט", transliteration: "Shaket", meaning: "Quiet", time: "7:30" },
      { hebrew: "מְאֻשָּׁר", transliteration: "Me'ushar", meaning: "Happy", time: "8:00" },
    ],
  },
  { 
    id: 5, 
    title: "Travel Vocabulary - Packing ✈️", 
    thumbnail: "https://img.youtube.com/vi/Lfj52BSoFq0/maxresdefault.jpg",
    youtubeId: "Lfj52BSoFq0",
    duration: "13:11", 
    coins: 70,
    category: "Travel",
    transcript: [
      { hebrew: "מִזְוָדָה", transliteration: "Mizvada", meaning: "Suitcase", time: "0:30" },
      { hebrew: "תִּיק גַּב", transliteration: "Tik gav", meaning: "Backpack", time: "0:45" },
      { hebrew: "לֶאֱרוֹז", transliteration: "Le'eroz", meaning: "To pack", time: "1:00" },
      { hebrew: "בְּגָדִים", transliteration: "Begadim", meaning: "Clothes", time: "1:30" },
      { hebrew: "חֻלְצָה", transliteration: "Chultza", meaning: "Shirt", time: "1:45" },
      { hebrew: "מִכְנָסַיִם", transliteration: "Michnasayim", meaning: "Pants", time: "2:00" },
      { hebrew: "נַעֲלַיִם", transliteration: "Na'alayim", meaning: "Shoes", time: "2:15" },
      { hebrew: "דַּרְכּוֹן", transliteration: "Darkon", meaning: "Passport", time: "2:30" },
      { hebrew: "וִיזָה", transliteration: "Viza", meaning: "Visa", time: "2:45" },
      { hebrew: "טִיסָה", transliteration: "Tisa", meaning: "Flight", time: "3:00" },
      { hebrew: "שָׂדֶה תְּעוּפָה", transliteration: "Sdeh te'ufa", meaning: "Airport", time: "3:30" },
      { hebrew: "מָטוֹס", transliteration: "Matos", meaning: "Airplane", time: "3:45" },
      { hebrew: "לִנְסֹעַ", transliteration: "Linsoa", meaning: "To travel", time: "4:00" },
      { hebrew: "חֻפְשָׁה", transliteration: "Chufsha", meaning: "Vacation", time: "4:30" },
      { hebrew: "מָלוֹן", transliteration: "Malon", meaning: "Hotel", time: "5:00" },
      { hebrew: "חֶדֶר", transliteration: "Cheder", meaning: "Room", time: "5:15" },
      { hebrew: "הַזְמָנָה", transliteration: "Hazmana", meaning: "Reservation", time: "5:30" },
      { hebrew: "תַּיָּר", transliteration: "Tayar", meaning: "Tourist", time: "6:00" },
      { hebrew: "מַפָּה", transliteration: "Mapa", meaning: "Map", time: "6:30" },
      { hebrew: "מַזְכֶּרֶת", transliteration: "Mazkeret", meaning: "Souvenir", time: "7:00" },
      { hebrew: "תְּמוּנָה", transliteration: "Tmuna", meaning: "Picture/Photo", time: "7:30" },
      { hebrew: "מַצְלֵמָה", transliteration: "Matslema", meaning: "Camera", time: "8:00" },
    ],
    exercises: [
      {
        type: "multiple_choice",
        question: "What does 'מִזְוָדָה' mean?",
        options: ["Passport", "Ticket", "Suitcase", "Hotel"],
        correct: 2
      },
      {
        type: "multiple_choice",
        question: "How do you say 'airport' in Hebrew?",
        options: ["Tisa", "Malon", "Darkon", "Sdeh te'ufa"],
        correct: 3
      },
    ]
  },
  { 
    id: 6, 
    title: "Winter Day in Israel ☕❄️", 
    thumbnail: "https://img.youtube.com/vi/owShOrwDC-c/maxresdefault.jpg",
    youtubeId: "owShOrwDC-c",
    duration: "13:00", 
    coins: 65,
    category: "Seasons",
    transcript: [
      { hebrew: "חֹרֶף", transliteration: "Choref", meaning: "Winter", time: "0:30" },
      { hebrew: "קַר", transliteration: "Kar", meaning: "Cold", time: "1:00" },
      { hebrew: "קָרִיר", transliteration: "Karir", meaning: "Cool", time: "1:15" },
      { hebrew: "גֶּשֶׁם", transliteration: "Geshem", meaning: "Rain", time: "1:30" },
      { hebrew: "יוֹרֵד גֶּשֶׁם", transliteration: "Yored geshem", meaning: "It's raining", time: "1:45" },
      { hebrew: "מִטְרִיָּה", transliteration: "Mitriya", meaning: "Umbrella", time: "2:00" },
      { hebrew: "מְעִיל", transliteration: "Me'il", meaning: "Coat", time: "2:30" },
      { hebrew: "סְוֶדֶר", transliteration: "Sveder", meaning: "Sweater", time: "2:45" },
      { hebrew: "מַגָּפַיִם", transliteration: "Magafayim", meaning: "Boots", time: "3:00" },
      { hebrew: "חַם", transliteration: "Cham", meaning: "Hot/Warm", time: "3:15" },
      { hebrew: "קָפֶה", transliteration: "Kafe", meaning: "Coffee", time: "3:30" },
      { hebrew: "תֵּה", transliteration: "Te", meaning: "Tea", time: "4:00" },
      { hebrew: "שׁוֹקוֹ חַם", transliteration: "Shoko cham", meaning: "Hot chocolate", time: "4:15" },
      { hebrew: "בַּיִת", transliteration: "Bayit", meaning: "Home", time: "4:30" },
      { hebrew: "נָעִים", transliteration: "Na'im", meaning: "Pleasant/Cozy", time: "5:00" },
      { hebrew: "שְׂמִיכָה", transliteration: "Smicha", meaning: "Blanket", time: "5:30" },
      { hebrew: "חִימוּם", transliteration: "Chimum", meaning: "Heating", time: "6:00" },
      { hebrew: "עָנָן", transliteration: "Anan", meaning: "Cloud", time: "6:30" },
      { hebrew: "רוּחַ", transliteration: "Ruach", meaning: "Wind", time: "7:00" },
      { hebrew: "סוּפָה", transliteration: "Sufa", meaning: "Storm", time: "7:30" },
      { hebrew: "בָּרָד", transliteration: "Barad", meaning: "Hail", time: "8:00" },
      { hebrew: "שֶׁלֶג", transliteration: "Sheleg", meaning: "Snow", time: "8:30" },
    ],
  },
  { 
    id: 7, 
    title: "Hebrew Learning Tips 📚", 
    thumbnail: "https://img.youtube.com/vi/gUmuuDHg2vM/maxresdefault.jpg",
    youtubeId: "gUmuuDHg2vM",
    duration: "12:12", 
    coins: 60,
    category: "Learning",
    transcript: [
      { hebrew: "טִיפ", transliteration: "Tip", meaning: "Tip", time: "0:30" },
      { hebrew: "עֵצָה", transliteration: "Etza", meaning: "Advice", time: "1:00" },
      { hebrew: "תַּרְגּוּל", transliteration: "Tirgul", meaning: "Practice", time: "1:30" },
      { hebrew: "חֲזָרָה", transliteration: "Chazara", meaning: "Review", time: "1:45" },
      { hebrew: "שִׁנּוּן", transliteration: "Shinun", meaning: "Memorization", time: "2:00" },
      { hebrew: "זִכָּרוֹן", transliteration: "Zikaron", meaning: "Memory", time: "2:15" },
      { hebrew: "הֲבָנָה", transliteration: "Havana", meaning: "Understanding", time: "2:30" },
      { hebrew: "אוֹצַר מִלִּים", transliteration: "Otzar milim", meaning: "Vocabulary", time: "3:00" },
      { hebrew: "מִלָּה", transliteration: "Mila", meaning: "Word", time: "3:15" },
      { hebrew: "מִשְׁפָּט", transliteration: "Mishpat", meaning: "Sentence", time: "3:30" },
      { hebrew: "דִּקְדּוּק", transliteration: "Dikduk", meaning: "Grammar", time: "4:00" },
      { hebrew: "הִגּוּי", transliteration: "Higui", meaning: "Pronunciation", time: "4:30" },
      { hebrew: "שִׂיחָה", transliteration: "Sicha", meaning: "Conversation", time: "5:00" },
      { hebrew: "לְדַבֵּר", transliteration: "Ledaber", meaning: "To speak", time: "5:15" },
      { hebrew: "לְהַקְשִׁיב", transliteration: "Lehakshiv", meaning: "To listen", time: "5:30" },
      { hebrew: "לִקְרוֹא", transliteration: "Likro", meaning: "To read", time: "5:45" },
      { hebrew: "לִכְתּוֹב", transliteration: "Lichtov", meaning: "To write", time: "6:00" },
      { hebrew: "בִּטָּחוֹן", transliteration: "Bitachon", meaning: "Confidence", time: "6:30" },
      { hebrew: "טָעוּת", transliteration: "Ta'ut", meaning: "Mistake", time: "7:00" },
      { hebrew: "הִשְׁתַּפְּרוּת", transliteration: "Hishtaprut", meaning: "Improvement", time: "7:30" },
      { hebrew: "הַצְלָחָה", transliteration: "Hatzlacha", meaning: "Success", time: "8:00" },
      { hebrew: "סַבְלָנוּת", transliteration: "Savlanut", meaning: "Patience", time: "8:30" },
    ],
    exercises: [
      {
        type: "multiple_choice",
        question: "What does 'אוֹצַר מִלִּים' mean?",
        options: ["Grammar", "Vocabulary", "Pronunciation", "Practice"],
        correct: 1
      },
    ]
  },
  { 
    id: 8, 
    title: "Adult Independence 🏠", 
    thumbnail: "https://img.youtube.com/vi/bAmh4Acx9jI/maxresdefault.jpg",
    youtubeId: "bAmh4Acx9jI",
    duration: "14:01", 
    coins: 75,
    category: "Adult Life",
    transcript: [
      { hebrew: "עַצְמָאוּת", transliteration: "Atzma'ut", meaning: "Independence", time: "0:30" },
      { hebrew: "לָגוּר לְבַד", transliteration: "Lagur levad", meaning: "To live alone", time: "0:45" },
      { hebrew: "דִּירָה", transliteration: "Dira", meaning: "Apartment", time: "1:00" },
      { hebrew: "בַּיִת", transliteration: "Bayit", meaning: "House", time: "1:15" },
      { hebrew: "שְׂכִירוּת", transliteration: "Sechirut", meaning: "Rent", time: "1:30" },
      { hebrew: "בַּעַל בַּיִת", transliteration: "Ba'al bayit", meaning: "Landlord", time: "1:45" },
      { hebrew: "חֶשְׁבּוֹנוֹת", transliteration: "Cheshbonot", meaning: "Bills", time: "2:00" },
      { hebrew: "חַשְׁמַל", transliteration: "Chashmal", meaning: "Electricity", time: "2:15" },
      { hebrew: "מַיִם", transliteration: "Mayim", meaning: "Water", time: "2:30" },
      { hebrew: "גַּז", transliteration: "Gaz", meaning: "Gas", time: "2:45" },
      { hebrew: "מַשְׂכּוֹרֶת", transliteration: "Maskoret", meaning: "Salary", time: "3:00" },
      { hebrew: "עֲבוֹדָה", transliteration: "Avoda", meaning: "Work/Job", time: "3:15" },
      { hebrew: "חִסָּכוֹן", transliteration: "Chisayon", meaning: "Savings", time: "3:30" },
      { hebrew: "בַּנְק", transliteration: "Bank", meaning: "Bank", time: "3:45" },
      { hebrew: "כֶּסֶף", transliteration: "Kesef", meaning: "Money", time: "4:00" },
      { hebrew: "אַחְרָיוּת", transliteration: "Achrayut", meaning: "Responsibility", time: "4:15" },
      { hebrew: "בּוֹגֵר", transliteration: "Boger", meaning: "Adult/Graduate", time: "4:30" },
      { hebrew: "לְנַקּוֹת", transliteration: "Lenakot", meaning: "To clean", time: "5:00" },
      { hebrew: "לְבַשֵּׁל", transliteration: "Levashel", meaning: "To cook", time: "5:15" },
      { hebrew: "קְנִיּוֹת", transliteration: "Kniyot", meaning: "Shopping", time: "5:30" },
      { hebrew: "סוּפֶּר", transliteration: "Super", meaning: "Supermarket", time: "5:45" },
      { hebrew: "הַצְלָחָה", transliteration: "Hatzlacha", meaning: "Success", time: "6:00" },
      { hebrew: "עָתִיד", transliteration: "Atid", meaning: "Future", time: "6:30" },
      { hebrew: "חֲלוֹמוֹת", transliteration: "Chalomot", meaning: "Dreams", time: "7:00" },
    ],
    exercises: [
      {
        type: "multiple_choice",
        question: "What does 'עַצְמָאוּת' mean?",
        options: ["Apartment", "Independence", "Success", "Future"],
        correct: 1
      },
      {
        type: "multiple_choice",
        question: "How do you say 'salary' in Hebrew?",
        options: ["Sechirut", "Chisayon", "Maskoret", "Cheshbonot"],
        correct: 2
      },
    ]
  },
];

export default function BabyVideos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [expandedVideoId, setExpandedVideoId] = useState(null);
  const [showVocabForVideo, setShowVocabForVideo] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [showFluent, setShowFluent] = useState(false);
  const [showExercises, setShowExercises] = useState(false);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [exerciseAnswers, setExerciseAnswers] = useState({});
  const [fillBlankAnswer, setFillBlankAnswer] = useState("");
  const [translateAnswer, setTranslateAnswer] = useState("");
  const [exerciseResults, setExerciseResults] = useState(null);
  const [fullTranscripts, setFullTranscripts] = useState({});
  const [loadingTranscript, setLoadingTranscript] = useState(null);
  const [customVideoUrl, setCustomVideoUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: userCoins } = useQuery({
    queryKey: ['userCoins'],
    queryFn: async () => {
      const coins = await base44.entities.UserCoins.list();
      return coins[0] || { coins: 0 };
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: wordRatings = [] } = useQuery({
    queryKey: ['wordRatings'],
    queryFn: () => base44.entities.Word.filter({ category: "wordbank" }),
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: customVideos = [] } = useQuery({
    queryKey: ['customVideos'],
    queryFn: async () => {
      const videos = await base44.entities.Video.list();
      // Filter out deleted videos for non-admin users
      const filtered = videos.filter(v => !v.deleted_at || currentUser?.role === 'admin');
      // Sort by order field
      return filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Check if current user is admin
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {}
    };
    fetchUser();
  }, []);

  const updateCoinsMutation = useMutation({
    mutationFn: (data) => base44.entities.UserCoins.update(userCoins?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userCoins'] }),
  });

  const createWordMutation = useMutation({
    mutationFn: (word) => base44.entities.Word.create(word),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordRatings'] }),
  });

  const updateWordMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Word.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordRatings'] }),
  });

  const createVideoMutation = useMutation({
    mutationFn: async (video) => {
      console.log('Creating video:', video);
      const result = await base44.entities.Video.create(video);
      console.log('Video created:', result);
      return result;
    },
    onSuccess: (newVideo) => {
      console.log('Success callback, new video:', newVideo);
      queryClient.invalidateQueries({ queryKey: ['customVideos'] });
      setCustomVideoUrl("");
      setTimeout(() => {
        setExpandedVideoId(`custom-${newVideo.id}`);
      }, 100);
      toast.success("Video added! 🎬");
    },
    onError: (error) => {
      console.error('Error creating video:', error);
      toast.error(`Failed: ${error.message || 'Unknown error'}`);
    }
  });

  const deleteWordMutation = useMutation({
    mutationFn: (id) => base44.entities.Word.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordRatings'] }),
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async ({ videoId, deleteData }) => {
      // Soft delete the video
      await base44.entities.Video.update(videoId, deleteData);
      
      // Find and disable any To-Do items pointing to this video
      const todos = await base44.entities.TodoItem.filter({ target_video_id: videoId.toString() });
      for (const todo of todos) {
        await base44.entities.TodoItem.update(todo.id, { is_active: false });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customVideos'] });
      queryClient.invalidateQueries({ queryKey: ['todoItems'] });
      toast.success("Video deleted and To-Do items disabled");
    },
  });

  const reorderVideosMutation = useMutation({
    mutationFn: async (videos) => {
      await Promise.all(
        videos.map((video, index) => 
          base44.entities.Video.update(video.id, { order: index })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customVideos'] });
      toast.success("Order saved!");
    },
  });

  const updateVideoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Video.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customVideos'] });
      toast.success("Updated!");
    },
  });

  // Auto-expand video from URL parameter
  useEffect(() => {
    const videoId = searchParams.get('videoId');
    if (videoId) {
      // Try to parse as number for hardcoded videos, keep as string for custom
      const parsedId = !isNaN(videoId) && !videoId.startsWith('custom-') 
        ? parseInt(videoId, 10) 
        : videoId;
      
      console.log('Auto-expanding video:', parsedId, 'from URL param:', videoId);
      setExpandedVideoId(parsedId);
      
      // Scroll to video after a short delay
      setTimeout(() => {
        const videoElement = document.getElementById(`video-${parsedId}`);
        console.log('Scrolling to element:', videoElement);
        if (videoElement) {
          videoElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    }
  }, [searchParams]);

  const removeFromBackpack = async (word) => {
    const existingWord = wordRatings.find(w => w.word === word.hebrew || w.word === word);
    if (existingWord) {
      await deleteWordMutation.mutateAsync(existingWord.id);
      toast.success("Removed from backpack");
    }
  };

  const handleVideoDragEnd = (result) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    if (sourceIndex === destIndex) return;
    
    const reordered = Array.from(customVideos);
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(destIndex, 0, removed);
    
    reorderVideosMutation.mutate(reordered);
  };

  const addTranscriptWordToBackpack = async (line) => {
    const existingWord = wordRatings.find(w => w.word === line.hebrew);
    if (existingWord) {
      toast.info("Already in backpack!");
      return;
    }
    await createWordMutation.mutateAsync({
      word: line.hebrew,
      translation: line.english,
      phonetic: line.transliteration,
      category: "wordbank",
      times_practiced: 1,
      mastered: false,
    });
    toast.success(`Added "${line.transliteration}" to backpack! 🎒`);
  };

  // Extract YouTube ID from URL
  const extractYouTubeId = (url) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?]+)/);
    return match ? match[1] : null;
  };

  const getWordRating = (hebrew) => {
    const found = wordRatings.find(w => w.word === hebrew);
    return found?.times_practiced || 0;
  };

  const handleRate = async (word, rating) => {
    const existingWord = wordRatings.find(w => w.word === word.hebrew);
    
    if (existingWord) {
      await updateWordMutation.mutateAsync({
        id: existingWord.id,
        data: { 
          times_practiced: rating,
          mastered: rating >= 5,
        }
      });
    } else {
      await createWordMutation.mutateAsync({
        word: word.hebrew,
        translation: word.meaning,
        phonetic: word.transliteration,
        category: "wordbank",
        times_practiced: rating,
        mastered: rating >= 5,
      });
    }

    if (rating >= 5) {
      toast.success("Added to Fluent! ⭐");
    }
  };

  const finishVideo = () => {
    if (selectedVideo) {
      updateCoinsMutation.mutate({ coins: (userCoins?.coins || 0) + selectedVideo.coins });
      toast.success(`+${selectedVideo.coins} coins earned! 🪙`);
    }
    setSelectedVideo(null);
    setShowExercises(false);
    setCurrentExercise(0);
    setExerciseAnswers({});
    setExerciseResults(null);
  };

  const addToBackpack = async (item) => {
    const existingWord = wordRatings.find(w => w.word === item.hebrew);
    if (existingWord) {
      toast.info("Already in backpack!");
      return;
    }
    await createWordMutation.mutateAsync({
      word: item.hebrew,
      translation: item.meaning,
      phonetic: item.transliteration,
      category: "wordbank",
      times_practiced: 1,
      mastered: false,
    });
    toast.success(`Added "${item.transliteration}" to backpack! 🎒`);
  };

  const checkExercise = (exerciseIdx, answer) => {
    const exercise = selectedVideo?.exercises?.[exerciseIdx];
    if (!exercise) return;
    
    let isCorrect = false;
    if (exercise.type === "multiple_choice") {
      isCorrect = answer === exercise.correct;
    } else if (exercise.type === "fill_blank") {
      isCorrect = answer.toLowerCase().trim() === exercise.answer.toLowerCase();
    } else if (exercise.type === "translate") {
      isCorrect = answer.toLowerCase().trim().includes(exercise.answer.toLowerCase().substring(0, 10));
    }
    
    setExerciseAnswers(prev => ({ ...prev, [exerciseIdx]: { answer, isCorrect } }));
  };

  const finishExercises = () => {
    const correct = Object.values(exerciseAnswers).filter(a => a.isCorrect).length;
    const total = selectedVideo?.exercises?.length || 0;
    setExerciseResults({ correct, total });
    if (correct === total) {
      updateCoinsMutation.mutate({ coins: (userCoins?.coins || 0) + 25 });
      toast.success("Perfect score! +25 bonus coins! 🎉");
    } else if (correct > 0) {
      updateCoinsMutation.mutate({ coins: (userCoins?.coins || 0) + (correct * 5) });
      toast.success(`+${correct * 5} coins for ${correct}/${total} correct!`);
    }
  };

  const fluentWords = wordRatings.filter(w => w.times_practiced >= 5);
  const learningWords = wordRatings.filter(w => w.times_practiced > 0 && w.times_practiced < 5);

  const generateFullTranscript = async (video) => {
    if (fullTranscripts[video.id]) return;
    
    setLoadingTranscript(video.id);
    try {
      const vocabList = video.transcript.map(t => `${t.hebrew} (${t.transliteration}) = ${t.meaning}`).join(", ");
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a realistic Hebrew lesson transcript for a video titled "${video.title}" about ${video.category}.
        
The video teaches these vocabulary words: ${vocabList}

Create a natural, conversational transcript as if a Hebrew teacher is teaching these words. Include:
- Hebrew sentences with vowels (nikkud)
- Transliteration 
- English translation

Format each line as an object with: hebrew, transliteration, english

Create about 15-20 conversational lines that naturally introduce and use these vocabulary words.`,
        response_json_schema: {
          type: "object",
          properties: {
            lines: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  hebrew: { type: "string" },
                  transliteration: { type: "string" },
                  english: { type: "string" }
                }
              }
            }
          }
        }
      });
      
      setFullTranscripts(prev => ({ ...prev, [video.id]: result.lines }));
    } catch (e) {
      toast.error("Failed to generate transcript");
    }
    setLoadingTranscript(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <GameHeader profile={userProfile} coins={userCoins?.coins} onBuyCoins={() => {}} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Home")} className="text-white/60 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">📺 Hebrew TV</h1>
              <p className="text-white/60">Watch videos & rate words you learn</p>
            </div>
          </div>
          <Button
            onClick={() => setBackpackOpen(true)}
            className="bg-amber-500/20 text-amber-400 border border-amber-500/50"
          >
            <Backpack className="w-5 h-5 mr-2" />
            Backpack ({fluentWords.length} ⭐)
          </Button>
        </div>

        {/* Video Player */}
        {selectedVideo ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden"
          >
            <div className="aspect-video bg-black">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1`}
                title={selectedVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="p-6">
              {!showExercises ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold text-lg">📝 Vocabulary - Tap + to add to backpack</h3>
                    <p className="text-white/60 text-sm">5 = Fluent ⭐</p>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedVideo.transcript.map((item, idx) => {
                      const currentRating = getWordRating(item.hebrew);
                      const inBackpack = wordRatings.find(w => w.word === item.hebrew);
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`border rounded-xl p-4 ${
                            currentRating >= 5 
                              ? "bg-green-500/10 border-green-500/30" 
                              : "bg-white/5 border-white/10"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <span className="text-white/40 text-xs w-12">{item.time}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl text-cyan-400 font-bold" dir="rtl">{item.hebrew}</span>
                                  {currentRating >= 5 && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                                </div>
                                <p className="text-white/60 text-sm">{item.transliteration} = {item.meaning}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {!inBackpack && (
                                <button
                                  onClick={() => addToBackpack(item)}
                                  className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 flex items-center justify-center transition-all"
                                  title="Add to backpack"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              )}
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(num => (
                                  <button
                                    key={num}
                                    onClick={() => handleRate(item, num)}
                                    className={`w-8 h-8 rounded-lg text-sm font-bold transition-all hover:scale-110 ${
                                      currentRating >= num 
                                        ? num === 5 
                                          ? "bg-green-500 text-white" 
                                          : "bg-cyan-500 text-white"
                                        : "bg-white/10 text-white/50 hover:bg-white/20"
                                    }`}
                                  >
                                    {num}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 mt-6">
                    {selectedVideo.exercises && selectedVideo.exercises.length > 0 && (
                      <Button
                        onClick={() => setShowExercises(true)}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-6 text-lg"
                      >
                        <BookOpen className="w-5 h-5 mr-2" />
                        Take Quiz ({selectedVideo.exercises.length} questions)
                      </Button>
                    )}
                    <Button
                      onClick={finishVideo}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-6 text-lg"
                    >
                      Done (+{selectedVideo.coins} coins) ✓
                    </Button>
                  </div>
                </>
              ) : (
                <div>
                  {!exerciseResults ? (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-bold text-lg">📝 Exercise {currentExercise + 1}/{selectedVideo.exercises.length}</h3>
                        <button onClick={() => setShowExercises(false)} className="text-white/60 hover:text-white">
                          ✕
                        </button>
                      </div>

                      {(() => {
                        const exercise = selectedVideo.exercises[currentExercise];
                        const answered = exerciseAnswers[currentExercise];
                        
                        return (
                          <motion.div
                            key={currentExercise}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-4"
                          >
                            <p className="text-white text-lg">{exercise.question}</p>
                            
                            {exercise.type === "multiple_choice" && (
                              <div className="grid gap-2">
                                {exercise.options.map((option, optIdx) => (
                                  <button
                                    key={optIdx}
                                    onClick={() => !answered && checkExercise(currentExercise, optIdx)}
                                    disabled={!!answered}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                                      answered
                                        ? optIdx === exercise.correct
                                          ? "bg-green-500/20 border-green-500 text-green-400"
                                          : answered.answer === optIdx
                                            ? "bg-red-500/20 border-red-500 text-red-400"
                                            : "bg-white/5 border-white/10 text-white/40"
                                        : "bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-cyan-400/50"
                                    }`}
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            )}

                            {exercise.type === "fill_blank" && (
                              <div className="space-y-3">
                                <p className="text-cyan-400" dir="rtl">{exercise.hebrew}</p>
                                <div className="flex gap-2">
                                  <Input
                                    value={fillBlankAnswer}
                                    onChange={(e) => setFillBlankAnswer(e.target.value)}
                                    placeholder="Your answer..."
                                    disabled={!!answered}
                                    className="bg-white/5 border-white/20 text-white"
                                  />
                                  {!answered && (
                                    <Button onClick={() => checkExercise(currentExercise, fillBlankAnswer)}>
                                      Check
                                    </Button>
                                  )}
                                </div>
                                {answered && (
                                  <p className={answered.isCorrect ? "text-green-400" : "text-red-400"}>
                                    {answered.isCorrect ? "Correct! ✓" : `Answer: ${exercise.answer}`}
                                  </p>
                                )}
                              </div>
                            )}

                            {exercise.type === "translate" && (
                              <div className="space-y-3">
                                <div className="flex gap-2">
                                  <Input
                                    value={translateAnswer}
                                    onChange={(e) => setTranslateAnswer(e.target.value)}
                                    placeholder="Type translation..."
                                    disabled={!!answered}
                                    className="bg-white/5 border-white/20 text-white"
                                  />
                                  {!answered && (
                                    <Button onClick={() => checkExercise(currentExercise, translateAnswer)}>
                                      Check
                                    </Button>
                                  )}
                                </div>
                                {answered && (
                                  <p className={answered.isCorrect ? "text-green-400" : "text-yellow-400"}>
                                    {answered.isCorrect ? "Correct! ✓" : `Expected: ${exercise.answer}`}
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="flex gap-3 mt-6">
                              {currentExercise > 0 && (
                                <Button variant="outline" onClick={() => setCurrentExercise(prev => prev - 1)} className="border-white/20 text-white">
                                  ← Back
                                </Button>
                              )}
                              <div className="flex-1" />
                              {currentExercise < selectedVideo.exercises.length - 1 ? (
                                <Button onClick={() => { setCurrentExercise(prev => prev + 1); setFillBlankAnswer(""); setTranslateAnswer(""); }}>
                                  Next <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                              ) : (
                                <Button onClick={finishExercises} className="bg-gradient-to-r from-green-500 to-emerald-500">
                                  Finish Quiz
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })()}
                    </>
                  ) : (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                      <div className="text-6xl mb-4">{exerciseResults.correct === exerciseResults.total ? "🎉" : "👍"}</div>
                      <h3 className="text-2xl font-bold text-white mb-2">
                        {exerciseResults.correct}/{exerciseResults.total} Correct!
                      </h3>
                      <p className="text-white/60 mb-6">
                        {exerciseResults.correct === exerciseResults.total 
                          ? "Perfect score! You earned 25 bonus coins!" 
                          : `You earned ${exerciseResults.correct * 5} coins`}
                      </p>
                      <Button onClick={finishVideo} className="bg-gradient-to-r from-green-500 to-emerald-500">
                        Continue
                      </Button>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Add Custom Video Section */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
              <p className="text-white/60 mb-3 text-center">🎬 Add a YouTube video</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customVideoUrl}
                  onChange={(e) => setCustomVideoUrl(e.target.value)}
                  placeholder="Paste YouTube URL here..."
                  className="flex-1 px-4 py-3 rounded-lg bg-slate-800 border border-white/30 text-white placeholder:text-white/50 outline-none focus:border-cyan-400"
                />
                <button
                  onClick={() => {
                    const ytId = extractYouTubeId(customVideoUrl);
                    console.log('YouTube ID extracted:', ytId);
                    console.log('Full URL:', customVideoUrl);
                    
                    if (!ytId) {
                      toast.error("Invalid YouTube URL - paste a link like: youtube.com/watch?v=...");
                      return;
                    }
                    
                    createVideoMutation.mutate({
                      video_url: customVideoUrl,
                      title: `YouTube Video ${Date.now()}`
                    });
                  }}
                  disabled={!customVideoUrl.trim() || createVideoMutation.isPending}
                  className="px-5 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createVideoMutation.isPending ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>

            {/* Custom Videos First */}
            {customVideos.length > 0 && (
              <div className="mb-4">
                <h2 className="text-white/60 text-sm font-medium mb-3">Your Videos</h2>
                <DragDropContext onDragEnd={handleVideoDragEnd}>
                  <Droppable droppableId="custom-videos">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                        {customVideos.map((video, index) => {
                  const ytId = extractYouTubeId(video.video_url);
                  if (!ytId) return null;

                  const isExpanded = expandedVideoId === `custom-${video.id}` || expandedVideoId == video.id;

                  return (
                    <Draggable key={`custom-${video.id}`} draggableId={`custom-${video.id}`} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-2xl border border-blue-500/30 overflow-hidden ${
                            snapshot.isDragging ? 'shadow-2xl scale-105' : ''
                          }`}
                        >
                      <div className="p-4 space-y-3">
                        {/* Admin Controls */}
                        {currentUser?.role === 'admin' && (
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-white/40">Admin Controls</span>
                            <VideoAdminControls
                              video={video}
                              onUpdate={(data) => updateVideoMutation.mutate({ id: video.id, data })}
                              onDelete={(data) => deleteVideoMutation.mutate({ videoId: video.id, deleteData: data })}
                              onReplaceUrl={(data) => updateVideoMutation.mutate({ id: video.id, data })}
                            />
                          </div>
                        )}

                        {/* Video Header */}
                        <div className="flex gap-4 cursor-pointer hover:bg-white/5 transition-all rounded-lg p-2">
                          <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing flex items-start pt-2">
                            <GripVertical className="w-5 h-5 text-white/40 hover:text-white/60" />
                          </div>
                          <div 
                            onClick={() => setExpandedVideoId(isExpanded ? null : `custom-${video.id}`)}
                            className="flex-1 flex gap-4"
                          >
                        <div className="relative w-40 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-black">
                          <img 
                            src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
                            alt={video.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                            }}
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <Play className="w-5 h-5 text-white fill-white" />
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <span className="bg-blue-500 px-2 py-0.5 rounded-full text-xs text-white font-medium">
                            My Video
                          </span>
                          <h3 className="text-white font-bold mt-1">
                            <EditableWord
                              text={video.title}
                              onSave={(newTitle) => updateVideoMutation.mutate({ id: video.id, data: { title: newTitle } })}
                              className="text-white font-bold"
                            />
                          </h3>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-white/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                        </div>
                        </div>

                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="p-4 bg-slate-800/50 border-t border-white/20 space-y-4"
                        >
                          <div className="aspect-video bg-black rounded-xl overflow-hidden">
                            <iframe
                              id={`youtube-player-${video.id}`}
                              width="100%"
                              height="100%"
                              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1`}
                              title={video.title}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>

                          <VideoTranscript 
                            videoId={video.id}
                            videoUrl={video.video_url}
                            onPauseVideo={() => {
                              const iframe = document.getElementById(`youtube-player-${video.id}`);
                              if (iframe && iframe.contentWindow) {
                                iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                              }
                            }}
                            onSeekVideo={(seconds) => {
                              const iframe = document.getElementById(`youtube-player-${video.id}`);
                              if (iframe && iframe.contentWindow) {
                                iframe.contentWindow.postMessage(`{"event":"command","func":"seekTo","args":[${seconds}, true]}`, '*');
                                iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                              }
                            }}
                          />
                          </motion.div>
                          )}
                          </div>
                          )}
                          </Draggable>
                          );
                          })}
                          {provided.placeholder}
                          </div>
                          )}
                          </Droppable>
                          </DragDropContext>
                          </div>
                          )}

                          <h2 className="text-white/60 text-sm font-medium mb-3">Recommended Videos</h2>
            {level1Videos.map((video) => {
              // Handle both string and number comparisons
              const isExpanded = expandedVideoId == video.id || expandedVideoId === video.id;
              const hasTranscript = fullTranscripts[video.id];
              const isLoading = loadingTranscript === video.id;
              const showingVocab = showVocabForVideo === video.id;
              
              return (
                <div
                  key={video.id}
                  id={`video-${video.id}`}
                  className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
                >
                  {/* Video Header - Clickable */}
                  <div 
                    onClick={() => {
                      const newExpanded = expandedVideoId === video.id ? null : video.id;
                      setExpandedVideoId(newExpanded);
                      if (newExpanded !== video.id) setShowVocabForVideo(null);
                      // Auto-generate transcript when expanding
                      if (newExpanded && !fullTranscripts[video.id] && loadingTranscript !== video.id) {
                        generateFullTranscript(video);
                      }
                    }}
                    className="flex gap-4 p-4 cursor-pointer hover:bg-white/5 transition-all"
                  >
                    <div className="relative w-40 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-black">
                      <img 
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = `https://via.placeholder.com/160x90/1e1b4b/ffffff?text=Video`;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Play className="w-5 h-5 text-white fill-white" />
                        </div>
                      </div>
                      <span className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                        {video.duration}
                      </span>
                    </div>
                    <div className="flex-1">
                      <span className="bg-purple-500/80 px-2 py-0.5 rounded-full text-xs text-white font-medium">
                        {video.category}
                      </span>
                      <h3 className="text-white font-bold mt-1">{video.title}</h3>
                      <div className="flex items-center gap-3 mt-2 text-sm">
                        <span className="text-white/60">{video.transcript.length} words</span>
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Coins className="w-4 h-4" />
                          <span className="font-bold">+{video.coins}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-white/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-800/50 border-t border-white/20 space-y-4">
                      {/* Video Player */}
                      <div className="aspect-video bg-black rounded-xl overflow-hidden">
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${video.youtubeId}`}
                          title={video.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>

                      {/* Transcript Loading/Display */}
                      {isLoading && (
                        <div className="flex items-center justify-center gap-2 py-4 text-white/60">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Generating transcript...
                        </div>
                      )}

                      {hasTranscript && (
                        <div className="space-y-1 max-h-64 overflow-y-auto bg-white/5 rounded-xl p-3">
                          <p className="text-white/50 text-xs font-medium mb-2">📝 Full Transcript (tap any line to add):</p>
                          {fullTranscripts[video.id].map((line, idx) => {
                            const inBackpack = wordRatings.find(w => w.word === line.hebrew);
                            return (
                              <button
                                key={idx}
                                onClick={() => addTranscriptWordToBackpack(line)}
                                className={`w-full text-left rounded-lg p-2 transition-all ${
                                  inBackpack 
                                    ? "bg-green-500/10 border border-green-500/30" 
                                    : "bg-white/5 hover:bg-white/10 border border-transparent hover:border-cyan-400/50"
                                }`}
                              >
                                <p className="text-cyan-400 font-bold leading-tight" dir="rtl">{line.hebrew}</p>
                                <p className="text-white/70 text-xs leading-tight">{line.transliteration}</p>
                                <p className="text-white/50 text-xs leading-tight">{line.english}</p>
                                {inBackpack && <span className="text-green-400 text-xs">✓ in backpack</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Vocab Button */}
                      <button
                        onClick={() => setShowVocabForVideo(showingVocab ? null : video.id)}
                        className={`w-full flex items-center justify-center gap-2 ${showingVocab ? 'bg-amber-600' : 'bg-gradient-to-r from-amber-500 to-orange-500'} text-white py-3 rounded-xl font-bold`}
                      >
                        <BookOpen className="w-5 h-5" />
                        {showingVocab ? '📚 Hide Vocabulary' : `📚 Show Vocabulary (${video.transcript.length} words)`}
                      </button>

                      {/* Vocabulary Words - Inline */}
                      {showingVocab && (
                        <div className="bg-white/5 rounded-xl p-4 space-y-2 max-h-80 overflow-y-auto">
                          {video.transcript.map((item, idx) => {
                            const inBackpack = wordRatings.find(w => w.word === item.hebrew);
                            return (
                              <div
                                key={idx}
                                className={`flex items-center justify-between p-3 rounded-lg ${
                                  inBackpack ? "bg-green-500/10 border border-green-500/30" : "bg-white/5 border border-white/10"
                                }`}
                              >
                                <div>
                                  <span className="text-cyan-400 font-bold text-lg" dir="rtl">{item.hebrew}</span>
                                  <p className="text-white/70 text-sm">{item.transliteration}</p>
                                  <p className="text-white/50 text-xs">{item.meaning}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {inBackpack ? (
                                    <button
                                      onClick={() => removeFromBackpack(item)}
                                      className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30"
                                    >
                                      ✕ Remove
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => addToBackpack(item)}
                                      className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-sm hover:bg-amber-500/30"
                                    >
                                      + Add
                                    </button>
                                  )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <h2 className="text-white/60 text-sm font-medium mb-3">Recommended Videos</h2>
      {level1Videos.map((video) => {
        // Handle both string and number comparisons
        const isExpanded = expandedVideoId == video.id || expandedVideoId === video.id;
        const hasTranscript = fullTranscripts[video.id];
        const isLoading = loadingTranscript === video.id;
        const showingVocab = showVocabForVideo === video.id;
        
        return (
          <div
            key={video.id}
            id={`video-${video.id}`}
            className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
          >
            {/* Video Header - Clickable */}
            <div 
              onClick={() => {
                const newExpanded = expandedVideoId === video.id ? null : video.id;
                setExpandedVideoId(newExpanded);
                if (newExpanded !== video.id) setShowVocabForVideo(null);
                // Auto-generate transcript when expanding
                if (newExpanded && !fullTranscripts[video.id] && loadingTranscript !== video.id) {
                  generateFullTranscript(video);
                }
              }}
              className="flex gap-4 p-4 cursor-pointer hover:bg-white/5 transition-all"
            >
              <div className="relative w-40 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-black">
                <img 
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = `https://via.placeholder.com/160x90/1e1b4b/ffffff?text=Video`;
                  }}
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                </div>
                <span className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                  {video.duration}
                </span>
              </div>
              <div className="flex-1">
                <span className="bg-purple-500/80 px-2 py-0.5 rounded-full text-xs text-white font-medium">
                  {video.category}
                </span>
                <h3 className="text-white font-bold mt-1">{video.title}</h3>
                <div className="flex items-center gap-3 mt-2 text-sm">
                  <span className="text-white/60">{video.transcript.length} words</span>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Coins className="w-4 h-4" />
                    <span className="font-bold">+{video.coins}</span>
                  </div>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-white/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="p-4 bg-slate-800/50 border-t border-white/20 space-y-4">
                {/* Video Player */}
                <div className="aspect-video bg-black rounded-xl overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${video.youtubeId}`}
                    title={video.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                {/* Transcript Loading/Display */}
                {isLoading && (
                  <div className="flex items-center justify-center gap-2 py-4 text-white/60">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating transcript...
                  </div>
                )}

                {hasTranscript && (
                  <div className="space-y-1 max-h-64 overflow-y-auto bg-white/5 rounded-xl p-3">
                    <p className="text-white/50 text-xs font-medium mb-2">📝 Full Transcript (tap any line to add):</p>
                    {fullTranscripts[video.id].map((line, idx) => {
                      const inBackpack = wordRatings.find(w => w.word === line.hebrew);
                      return (
                        <button
                          key={idx}
                          onClick={() => addTranscriptWordToBackpack(line)}
                          className={`w-full text-left rounded-lg p-2 transition-all ${
                            inBackpack 
                              ? "bg-green-500/10 border border-green-500/30" 
                              : "bg-white/5 hover:bg-white/10 border border-transparent hover:border-cyan-400/50"
                          }`}
                        >
                          <p className="text-cyan-400 font-bold leading-tight" dir="rtl">{line.hebrew}</p>
                          <p className="text-white/70 text-xs leading-tight">{line.transliteration}</p>
                          <p className="text-white/50 text-xs leading-tight">{line.english}</p>
                          {inBackpack && <span className="text-green-400 text-xs">✓ in backpack</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Vocab Button */}
                <button
                  onClick={() => setShowVocabForVideo(showingVocab ? null : video.id)}
                  className={`w-full flex items-center justify-center gap-2 ${showingVocab ? 'bg-amber-600' : 'bg-gradient-to-r from-amber-500 to-orange-500'} text-white py-3 rounded-xl font-bold`}
                >
                  <BookOpen className="w-5 h-5" />
                  {showingVocab ? '📚 Hide Vocabulary' : `📚 Show Vocabulary (${video.transcript.length} words)`}
                </button>

                {/* Vocabulary Words - Inline */}
                {showingVocab && (
                  <div className="bg-white/5 rounded-xl p-4 space-y-2 max-h-80 overflow-y-auto">
                    {video.transcript.map((item, idx) => {
                      const inBackpack = wordRatings.find(w => w.word === item.hebrew);
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            inBackpack ? "bg-green-500/10 border border-green-500/30" : "bg-white/5 border border-white/10"
                          }`}
                        >
                          <div>
                            <span className="text-cyan-400 font-bold text-lg" dir="rtl">{item.hebrew}</span>
                            <p className="text-white/70 text-sm">{item.transliteration}</p>
                            <p className="text-white/50 text-xs">{item.meaning}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {inBackpack ? (
                              <button
                                onClick={() => removeFromBackpack(item)}
                                className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30"
                              >
                                ✕ Remove
                              </button>
                            ) : (
                              <button
                                onClick={() => addToBackpack(item)}
                                className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-sm hover:bg-amber-500/30"
                              >
                                + Add
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
          )}
        </div>
      )}
    </div>

    {/* Backpack Dialog */}
      <Dialog open={backpackOpen} onOpenChange={setBackpackOpen}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Backpack className="w-6 h-6 text-amber-400" />
              My Backpack
            </DialogTitle>
          </DialogHeader>
          
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowFluent(true)}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                showFluent ? "bg-green-500/20 text-green-400 border border-green-500/50" : "bg-white/5 text-white/60"
              }`}
            >
              ⭐ Fluent ({fluentWords.length})
            </button>
            <button
              onClick={() => setShowFluent(false)}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                !showFluent ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50" : "bg-white/5 text-white/60"
              }`}
            >
              📚 Learning ({learningWords.length})
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2">
            {(showFluent ? fluentWords : learningWords).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/60">
                  {showFluent ? "No fluent words yet!" : "No words in progress!"}
                </p>
                <p className="text-white/40 text-sm mt-2">
                  {showFluent ? "Rate words 5/5 to add them here." : "Start rating words to track progress."}
                </p>
              </div>
            ) : (
              (showFluent ? fluentWords : learningWords).map((word) => (
                <div
                  key={word.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold text-lg" dir="rtl">{word.word}</span>
                      {word.times_practiced >= 5 && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                    </div>
                    <p className="text-white/60 text-sm">{word.phonetic} - {word.translation}</p>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(num => (
                      <div
                        key={num}
                        className={`w-4 h-4 rounded-full ${
                          word.times_practiced >= num ? "bg-cyan-500" : "bg-white/20"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Translator Widget */}
      <TranslatorWidget />
      </div>
      );
      }