// bookContent.js - Story content

const bookContent = {
    chapters: [
        {
            id: 1,
            chapterId: "chapterID_get_this_from_the_rowid_from_Database",
            title: "Chapter Nmae",
            content: [
                { type: 'paragraph', text: 'Use these format for enterting text, for formating them use default html tags like <b>Bold</b>, <i>Italic</i> use "br" to break<br> the <br> lines' },
                { type: 'image', src: 'here_comes_your_image_url' },
                { type: 'lyrics', text: 'Use this if you want to put some poem lines or music lines or some quotes' },
                { type: 'paragraph', text: 'Just then, she walked out, smiling when she saw him. He took off his earphones, and the long day suddenly felt lighter.' },
                { type: 'metadata', date: 'May 21,2015', author: 'Written by: Aathithyan' },
                { type: 'rating', chapterId: "chapterID_get_this_from_the_rowid_from_Database" }
            ]
        }
            ]
        }

        

    ]
};

window.bookContent = bookContent;

// Also support Node.js environments (if needed for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = bookContent;
}

console.log('✅ bookContent.js loaded successfully');
console.log('📚 Loaded', bookContent.chapters.length, 'chapters');
console.log('🔑 Chapter IDs:', bookContent.chapters.map(c => ({ id: c.id, chapterId: c.chapterId })));
