// Content script — runs on velog.io/write
// Auto-fills title, tags, and content from Notion

(async function () {
  const { velogDraft } = await chrome.storage.local.get('velogDraft');
  if (!velogDraft || Date.now() - velogDraft.timestamp > 30000) return;

  await chrome.storage.local.remove('velogDraft');

  const { title, tags, content } = velogDraft;

  // Wait for page to fully load
  await sleep(2500);

  console.log('[Amplai] Starting auto-fill...');

  // 1. Title — find the first textarea or contenteditable
  if (title) {
    await fillTitle(title);
  }

  await sleep(500);

  // 2. Tags
  if (tags) {
    await fillTags(tags);
  }

  await sleep(500);

  // 3. Content — the hardest part
  if (content) {
    await fillContent(content);
  }

  console.log('[Amplai] Auto-fill complete!');
})();

async function fillTitle(title) {
  // Try multiple selectors for title
  const selectors = [
    'textarea[placeholder*="제목"]',
    'textarea[placeholder*="Title"]',
    'input[placeholder*="제목"]',
    'textarea',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      el.focus();
      setNativeValue(el, title);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('[Amplai] Title filled via:', sel);
      return;
    }
  }
  console.log('[Amplai] Title element not found');
}

async function fillTags(tagsStr) {
  const tagList = tagsStr.split(',').map(t => t.trim()).filter(Boolean);

  const selectors = [
    'input[placeholder*="태그"]',
    'input[placeholder*="tag"]',
    'input[placeholder*="Tag"]',
  ];

  let tagInput = null;
  for (const sel of selectors) {
    tagInput = document.querySelector(sel);
    if (tagInput) break;
  }

  if (!tagInput) {
    console.log('[Amplai] Tag input not found');
    return;
  }

  for (const tag of tagList) {
    tagInput.focus();
    setNativeValue(tagInput, tag);
    tagInput.dispatchEvent(new Event('input', { bubbles: true }));
    tagInput.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(200);

    // Press Enter to submit tag
    ['keydown', 'keypress', 'keyup'].forEach(eventType => {
      tagInput.dispatchEvent(new KeyboardEvent(eventType, {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
      }));
    });
    await sleep(300);
  }
  console.log('[Amplai] Tags filled:', tagList);
}

async function fillContent(content) {
  // Strategy 1: CodeMirror instance
  const cm = document.querySelector('.CodeMirror');
  if (cm && cm.CodeMirror) {
    cm.CodeMirror.setValue(content);
    console.log('[Amplai] Content filled via CodeMirror');
    return;
  }

  // Strategy 2: Find CodeMirror via querySelector and set value through textarea
  const cmTextarea = document.querySelector('.CodeMirror textarea');
  if (cmTextarea) {
    cmTextarea.focus();
    await pasteText(content);
    console.log('[Amplai] Content filled via CodeMirror textarea paste');
    return;
  }

  // Strategy 3: Any contenteditable after title
  const editables = document.querySelectorAll('[contenteditable="true"]');
  for (const el of editables) {
    // Skip if it looks like the title
    if (el.closest('[class*="title"]')) continue;
    el.focus();
    await pasteText(content);
    console.log('[Amplai] Content filled via contenteditable paste');
    return;
  }

  // Strategy 4: Second textarea (first is title)
  const textareas = document.querySelectorAll('textarea');
  if (textareas.length > 1) {
    const editor = textareas[1];
    editor.focus();
    setNativeValue(editor, content);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('[Amplai] Content filled via second textarea');
    return;
  }

  // Strategy 5: Look for any editor-like element
  const editorSelectors = [
    '.ProseMirror',
    '[role="textbox"]',
    '.toastui-editor',
    '.ql-editor',
    '[data-slate-editor]',
    '.cm-content',  // CodeMirror 6
    '.cm-editor',   // CodeMirror 6
  ];

  for (const sel of editorSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      el.focus();
      await pasteText(content);
      console.log('[Amplai] Content filled via:', sel);
      return;
    }
  }

  // Fallback: copy to clipboard and alert user
  try {
    await navigator.clipboard.writeText(content);
    console.log('[Amplai] Content copied to clipboard. Paste manually with Cmd+V.');

    // Show a small notification
    const notif = document.createElement('div');
    notif.textContent = '[Amplai] 본문이 클립보드에 복사되었습니다. Cmd+V로 붙여넣기 해주세요.';
    notif.style.cssText = 'position:fixed;top:16px;right:16px;background:#1a1a1a;color:white;padding:12px 20px;border-radius:8px;font-size:14px;z-index:99999;';
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 5000);
  } catch (e) {
    console.log('[Amplai] All strategies failed:', e);
  }
}

// Simulate paste via clipboard API
async function pasteText(text) {
  try {
    // Write to clipboard first
    await navigator.clipboard.writeText(text);

    // Dispatch paste event
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', text);

    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
  } catch (e) {
    // Fallback: direct execCommand
    try {
      document.execCommand('insertText', false, text);
    } catch (e2) {
      console.log('[Amplai] Paste simulation failed:', e2);
    }
  }
}

// Helpers
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setNativeValue(element, value) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    element.constructor.prototype, 'value'
  )?.set;
  const protoSetter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(element).constructor.prototype, 'value'
  )?.set;

  if (valueSetter && protoSetter && valueSetter !== protoSetter) {
    protoSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event('input', { bubbles: true }));
}
