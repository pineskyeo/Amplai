// Config loaded from config.js (not committed to git)
const NOTION_API_KEY = typeof CONFIG !== 'undefined' ? CONFIG.NOTION_API_KEY : '';
const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

const statusEl = document.getElementById('status');
let fetchedContent = '';

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = 'status ' + type;
}

function extractPageId(input) {
  input = input.trim();
  // Full URL: https://notion.so/Title-abc123def456 or https://notion.so/abc123def456
  const urlMatch = input.match(/([a-f0-9]{32})(?:\?|$)/);
  if (urlMatch) return urlMatch[1];

  // UUID format
  const uuidMatch = input.match(/([a-f0-9-]{36})/);
  if (uuidMatch) return uuidMatch[1].replace(/-/g, '');

  // Last segment of URL
  const segments = input.split('/');
  const last = segments[segments.length - 1].split('?')[0];
  const idMatch = last.match(/([a-f0-9]{32})$/);
  if (idMatch) return idMatch[1];

  return input.replace(/-/g, '');
}

// Notion API: Get page properties
async function getPageProperties(pageId) {
  const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': NOTION_VERSION,
    },
  });
  if (!res.ok) throw new Error(`Page fetch failed: ${res.status}`);
  return res.json();
}

// Notion API: Get page blocks (content)
async function getPageBlocks(pageId) {
  const blocks = [];
  let cursor = undefined;

  do {
    const url = `${NOTION_API}/blocks/${pageId}/children?page_size=100${cursor ? '&start_cursor=' + cursor : ''}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': NOTION_VERSION,
      },
    });
    if (!res.ok) throw new Error(`Blocks fetch failed: ${res.status}`);
    const data = await res.json();
    blocks.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return blocks;
}

// Convert Notion blocks to Markdown
function blocksToMarkdown(blocks) {
  return blocks.map(block => blockToMd(block)).filter(Boolean).join('\n');
}

function richTextToMd(richTexts) {
  if (!richTexts) return '';
  return richTexts.map(rt => {
    let text = rt.plain_text || '';
    if (rt.annotations) {
      if (rt.annotations.bold) text = `**${text}**`;
      if (rt.annotations.italic) text = `*${text}*`;
      if (rt.annotations.code) text = `\`${text}\``;
      if (rt.annotations.strikethrough) text = `~~${text}~~`;
    }
    if (rt.href) text = `[${text}](${rt.href})`;
    return text;
  }).join('');
}

function blockToMd(block) {
  const type = block.type;
  const data = block[type];

  switch (type) {
    case 'paragraph':
      return richTextToMd(data?.rich_text) + '\n';
    case 'heading_1':
      return `# ${richTextToMd(data?.rich_text)}\n`;
    case 'heading_2':
      return `## ${richTextToMd(data?.rich_text)}\n`;
    case 'heading_3':
      return `### ${richTextToMd(data?.rich_text)}\n`;
    case 'bulleted_list_item':
      return `- ${richTextToMd(data?.rich_text)}`;
    case 'numbered_list_item':
      return `1. ${richTextToMd(data?.rich_text)}`;
    case 'to_do':
      const checked = data?.checked ? 'x' : ' ';
      return `- [${checked}] ${richTextToMd(data?.rich_text)}`;
    case 'code':
      const lang = data?.language || '';
      return `\`\`\`${lang}\n${richTextToMd(data?.rich_text)}\n\`\`\`\n`;
    case 'quote':
      return `> ${richTextToMd(data?.rich_text)}\n`;
    case 'callout':
      return `> ${richTextToMd(data?.rich_text)}\n`;
    case 'divider':
      return '---\n';
    case 'table_row':
      return null; // handled by table
    case 'image':
      const url = data?.file?.url || data?.external?.url || '';
      return url ? `![image](${url})\n` : '';
    default:
      return null;
  }
}

// Extract title from page properties
function extractTitle(properties) {
  for (const [key, value] of Object.entries(properties)) {
    if (value.type === 'title' && value.title) {
      return value.title.map(t => t.plain_text).join('');
    }
  }
  return '';
}

// Extract tags from page properties
function extractTags(properties) {
  const tags = [];
  for (const [key, value] of Object.entries(properties)) {
    if (value.type === 'multi_select') {
      tags.push(...value.multi_select.map(t => t.name));
    }
  }
  return tags;
}

// Step 1: Fetch from Notion
document.getElementById('fetchBtn').addEventListener('click', async () => {
  const input = document.getElementById('notionUrl').value;
  if (!input.trim()) {
    showStatus('URL 또는 ID를 입력해주세요', 'error');
    return;
  }

  showStatus('Notion에서 가져오는 중...', 'loading');

  try {
    const pageId = extractPageId(input);
    const [page, blocks] = await Promise.all([
      getPageProperties(pageId),
      getPageBlocks(pageId),
    ]);

    const title = extractTitle(page.properties);
    const tags = extractTags(page.properties);
    const markdown = blocksToMarkdown(blocks);

    // Clean title: remove [카테고리] prefix and (Velog ...) suffix
    const cleanTitle = title
      .replace(/^\[.*?\]\s*/, '')
      .replace(/\s*\(Velog.*?\)\s*$/, '')
      .trim();

    document.getElementById('title').value = cleanTitle;
    document.getElementById('tags').value = tags.join(', ');

    fetchedContent = markdown;
    const previewEl = document.getElementById('preview');
    previewEl.textContent = markdown.substring(0, 500) + (markdown.length > 500 ? '\n...' : '');
    previewEl.style.display = 'block';

    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';

    showStatus(`가져오기 완료! (${blocks.length}개 블록)`, 'success');
  } catch (e) {
    showStatus('가져오기 실패: ' + e.message, 'error');
  }
});

// Back button
document.getElementById('backBtn').addEventListener('click', () => {
  document.getElementById('step1').style.display = 'block';
  document.getElementById('step2').style.display = 'none';
  statusEl.className = 'status';
});

// Publish to Velog
document.getElementById('publishBtn').addEventListener('click', async () => {
  const title = document.getElementById('title').value.trim();
  const tags = document.getElementById('tags').value.trim();

  if (!fetchedContent) {
    showStatus('본문이 없습니다', 'error');
    return;
  }

  const data = { title, tags, content: fetchedContent, timestamp: Date.now() };
  await chrome.storage.local.set({ velogDraft: data });

  chrome.tabs.create({ url: 'https://velog.io/write' }, () => {
    showStatus('Velog 글쓰기 페이지를 열었습니다!', 'success');
  });
});

// Copy only
document.getElementById('copyBtn').addEventListener('click', async () => {
  if (!fetchedContent) {
    showStatus('본문이 없습니다', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(fetchedContent);
    showStatus('클립보드에 복사되었습니다!', 'success');
  } catch {
    showStatus('복사 실패. 수동으로 복사해주세요.', 'error');
  }
});
