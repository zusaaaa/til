const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');

/**
 * READ MEを更新する
 */
async function updateReadme() {
    console.log('📊 Updating TIL statistics...');
    
    // 統計データを収集
    const stats = await collectStats();
    
    // README.mdを読み込み
    let readmeContent = await fs.readFile('README.md', 'utf8');
    
    // 各セクションを更新
    readmeContent = updateStatsSection(readmeContent, stats);
    readmeContent = updateRecentEntries(readmeContent, stats);
    readmeContent = updateLatestResources(readmeContent, stats);
    
    // README.mdを書き込み
    await fs.writeFile('README.md', readmeContent);
    
    console.log('✅ README.md updated successfully!');
    console.log(`📈 Total entries: ${stats.totalEntries}`);
    console.log(`🔥 Current streak: ${stats.currentStreak} days`);
}

/**
 * TILエントリからデータを取得し、記入項目を返す
 * 
 * @returns 
 */
async function collectStats() {
    // TILエントリを収集
    const tilFiles = glob.sync('2025/**/*.md');
    
    // Resourcesファイルを収集
    const resourceFiles = glob.sync('resources/**/*.md', {
        ignore: ['resources/**/README.md']
    });
    
    // 日付順にソート
    const sortedTilFiles = tilFiles
        .map(file => ({
            path: file,
            date: extractDateFromPath(file),
            title: extractTitleFromFile(file)
        }))
        .filter(entry => entry.date)
        .sort((a, b) => b.date - a.date);
    
    const sortedResourceFiles = resourceFiles
        .map(file => ({
            path: file,
            date: fs.statSync(file).mtime,
            title: extractTitleFromFile(file)
        }))
        .sort((a, b) => b.date - a.date);
    
    // 連続日数を計算
    const currentStreak = calculateStreak(sortedTilFiles);
    
    return {
        totalEntries: tilFiles.length,
        currentStreak: currentStreak,
        recentEntries: sortedTilFiles.slice(0, 5),
        latestResources: sortedResourceFiles.slice(0, 3),
        startDate: '2025-08-20'
    };
}

/**
 * 日付を抽出
 * 
 * @param {*} filePath 
 * @returns 
 */
function extractDateFromPath(filePath) {
    // ファイルパスから日付を抽出: 
    // ex. 2025/08/20250820-aws-rds.md -> 2025-08-20
    const match = filePath.match(/(\d{4})(\d{2})(\d{2})/);
    if (match) {
        const [, year, month, day] = match;
        return new Date(`${year}-${month}-${day}`);
    }
    return null;
}

/**
 * ファイル名からタイトルを作成
 * 
 * @param {*} filePath 
 * @returns 
 */
function extractTitleFromFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const titleMatch = content.match(/^# (.+)$/m);
        if (titleMatch) {
            return titleMatch[1];
        }
    } catch (error) {
        console.warn(`Could not read file: ${filePath}`);
    }
    
    // ファイル名から推測
    const filename = path.basename(filePath, '.md');
    return filename.replace(/^\d{8}-/, '').replace(/-/g, ' ');
}

/**
 * 連続日数を取得
 * 
 * @param {*} sortedEntries 
 * @returns 
 */
function calculateStreak(sortedEntries) {
    if (sortedEntries.length === 0) return 0;
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (const entry of sortedEntries) {
        const entryDate = new Date(entry.date);
        entryDate.setHours(0, 0, 0, 0);
        
        const diffDays = Math.floor((currentDate - entryDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === streak) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    return streak;
}

function updateStatsSection(content, stats) {
    const statsPattern = /## 📊 Stats\s*\n([\s\S]*?)(?=\n## )/;
    const newStats = `## 📊 Stats

- **Total entries:** ${stats.totalEntries}
- **Current streak:** ${stats.currentStreak} days
- **Started:** ${stats.startDate}
`;

    return content.replace(statsPattern, newStats);
}

function updateRecentEntries(content, stats) {
    const recentPattern = /## 📝 Recent Entries\s*\n([\s\S]*?)(?=\n## )/;
    
    const recentList = stats.recentEntries
        .map(entry => {
            const dateStr = entry.date.toISOString().split('T')[0];
            const linkPath = entry.path;
            return `- ${dateStr}: [${entry.title}](./${linkPath})`;
        })
        .join('\n');
    
    const newRecent = `## 📝 Recent Entries

${recentList}
`;

    return content.replace(recentPattern, newRecent);
}

function updateLatestResources(content, stats) {
    const resourcePattern = /## 📚 Latest Resources\s*\n([\s\S]*?)(?=\n## )/;
    
    const resourceList = stats.latestResources
        .map(entry => {
            const dateStr = entry.date.toISOString().split('T')[0];
            const linkPath = entry.path;
            return `- ${dateStr}: [${entry.title}](./${linkPath})`;
        })
        .join('\n');
    
    const newResources = `## 📚 Latest Resources

${resourceList}
`;

    return content.replace(resourcePattern, newResources);
}

// スクリプト実行
updateReadme().catch(console.error);