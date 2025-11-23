// Project Data
const projects = {
    'aphonia': {
        title: 'Aphonia',
        subtitle: 'Narrative Puzzle Game',
        desc: 'A narrative puzzle game about the erosion of sound and the act of listening. Players accompany Leelo, a mute being with an extraordinary sensitivity to what others no longer notice. Currently in development by Moonflux Interactive.',
        heroMedia: '<iframe width="100%" height="100%" src="https://www.youtube.com/embed/YOUR_VIDEO_ID_HERE" title="Aphonia Trailer" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>',
        gallery: [],
        tools: ['Unity', 'C#', 'Blender'],
        year: '2025',
        links: [
            { text: 'Wishlist on Steam', url: 'https://store.steampowered.com/app/4025110/Aphonia__Leelos_Journey_to_Harmony/' },
            { text: 'Moonflux Interactive', url: 'https://moonflux-interactive.com' }
        ]
    },
    'dolphinrush': {
        title: 'Dolphin Rush',
        subtitle: 'Educational Game',
        desc: 'Created for Whale and Dolphin Conservation. An interactive experience raising awareness for marine life preservation.',
        heroMedia: '<img src="images/portfolio/dolphin_cover.jpg" onerror="this.src=\'https://placehold.co/800x450?text=Dolphin+Rush\'" style="width:100%; height:100%; object-fit:cover;">',
        tools: ['Unity', 'C#'],
        year: '2023',
        links: [
            { text: 'Play Game', url: 'https://moonflux-interactive.com' }
        ]
    },
    'bf': {
        title: 'BF',
        subtitle: '3D Composition',
        desc: 'A study in abstract form and lighting. This piece explores the relationship between organic shapes and synthetic materials.',
        heroMedia: '<img src="images/portfolio/BF.png" alt="BF" style="width:100%; height:100%; object-fit:contain;">',
        tools: ['Blender', 'Cycles'],
        year: '2024'
    },
    'fbdnl': {
        title: 'FBDNL',
        subtitle: 'Digital Art',
        desc: 'Digital art composition focusing on color theory and mood.',
        heroMedia: '<img src="images/portfolio/FBDNL.png" alt="FBDNL" style="width:100%; height:100%; object-fit:contain;">',
        tools: ['Photoshop'],
        year: '2023'
    },
    'fridom': {
        title: 'Fridom',
        subtitle: 'Concept Art',
        desc: 'Character concept art exploring futuristic fashion and cybernetic enhancements.',
        heroMedia: '<img src="images/portfolio/Fridom.png" alt="Fridom" style="width:100%; height:100%; object-fit:contain;">',
        tools: ['Photoshop', 'Midjourney'],
        year: '2023'
    },
    'fys02': {
        title: 'FYS 02',
        subtitle: 'Abstract Design',
        desc: 'Abstract geometric design.',
        heroMedia: '<img src="images/portfolio/fys02.png" alt="FYS 02" style="width:100%; height:100%; object-fit:contain;">',
        tools: ['Illustrator'],
        year: '2023'
    },
    'gone': {
        title: 'Gone',
        subtitle: 'Atmospheric Render',
        desc: 'An atmospheric scene depicting isolation and vastness.',
        heroMedia: '<img src="images/portfolio/Gone.png" alt="Gone" style="width:100%; height:100%; object-fit:contain;">',
        tools: ['Blender'],
        year: '2024'
    },
    'sunshine': {
        title: 'Sunshine',
        subtitle: 'Lighting Study',
        desc: 'A study of natural lighting and volumetric fog effects.',
        heroMedia: '<img src="images/portfolio/Sunshine.png" alt="Sunshine" style="width:100%; height:100%; object-fit:contain;">',
        tools: ['Unreal Engine 5'],
        year: '2024'
    },
    'thoughts': {
        title: 'Thoughts',
        subtitle: 'Surreal Composition',
        desc: 'Surrealist composition exploring the visualization of thought processes.',
        heroMedia: '<img src="images/portfolio/Thoughts.png" alt="Thoughts" style="width:100%; height:100%; object-fit:contain;">',
        tools: ['Blender', 'Photoshop'],
        year: '2024'
    },
    'underthebridge': {
        title: 'Under The Bridge',
        subtitle: 'Environment Art',
        desc: 'Detailed environment art piece focusing on urban decay and texture work.',
        heroMedia: '<img src="images/portfolio/UnderTheBridge.png" alt="Under The Bridge" style="width:100%; height:100%; object-fit:contain;">',
        tools: ['Maya', 'Substance Painter'],
        year: '2024'
    },
    'youtube_channel': {
        title: 'YouTube Channel',
        subtitle: 'Devlogs & Tutorials',
        desc: 'Check out my latest game development logs, tutorials, and project showcases on YouTube.',
        heroMedia: '<iframe width="100%" height="100%" src="https://www.youtube.com/embed/videoseries?list=YOUR_PLAYLIST_ID" title="YouTube Channel" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>',
        tools: ['Video Editing', 'Premiere Pro'],
        year: 'Ongoing',
        links: [
            { text: 'Visit Channel', url: 'https://www.youtube.com/@YourChannelHandle' }
        ]
    }
};
