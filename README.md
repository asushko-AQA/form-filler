# AutoForm Filler — Chrome Extension

A Chrome extension that fills web forms by hooking into `data-automation-id` attributes with semi-generated data (mix of fixed + random values).

---

## 📦 Installation

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select the `form-filler-extension` folder
5. The extension is now installed ✅

---

## 🚀 How to Use

### Option A — Floating button on the page
A purple **"Auto Fill"** button appears in the bottom-right corner of any page.  
Click it to fill all `data-automation-id` fields instantly.

### Option B — Extension popup
Click the extension icon in Chrome's toolbar:
- **Fill tab** → "Fill Form Now" button + shows filled/skipped stats
- **Fields tab** → Scan the current page to see all detected `data-automation-id` fields (green dot = recognized, grey dot = unknown pattern)
- **Config tab** → Set fixed values for email, name, username, password

---

## 🔧 Supported `data-automation-id` Patterns

| Pattern keywords | Fills with |
|---|---|
| `firstName`, `fname`, `given-name` | Random first name |
| `lastName`, `lname`, `surname` | Random last name |
| `name` | Full name |
| `email`, `e-mail` | Random email |
| `phone`, `mobile`, `cell`, `tel` | Random US phone |
| `username`, `login`, `handle` | Random username |
| `password`, `passwd`, `pwd` | Random 12-char password |
| `confirm-password`, `repeat-pass` | Same password |
| `address`, `street`, `addr` | Random street address |
| `city` | Random US city |
| `state`, `province`, `region` | Random US state code |
| `zip`, `postal`, `postcode` | Random 5-digit ZIP |
| `country` | United States |
| `company`, `organization`, `org` | Random company name |
| `birthdate`, `dob`, `date-of-birth` | Random DOB (YYYY-MM-DD) |

Pattern matching is **case-insensitive** and uses **substring matching** — so `workEmail`, `user-email`, `emailAddress` all resolve correctly.

---

## ⚙️ Fixed vs Random Fields

In the **Config tab**, you can pin specific values that will always be used instead of random ones:
- Email → always use your test email
- Name → always use the same name
- Password → always use your test password

Any field left blank in Config will continue to be randomly generated each run.

---

## 🔌 Adding Custom Field Mappings

To add support for a new `data-automation-id` pattern, edit `content.js` and find the `matchAutomationId()` function. Add a new condition:

```js
if (/your-pattern/.test(s)) return profile.someField;
```

---

## 🛠 Technical Notes

- Works with **React, Angular, Vue** — uses native input value setters to trigger synthetic events
- Handles `<input>`, `<textarea>`, and `<select>` elements
- Re-injects the floating button on SPA navigation (MutationObserver)
- Fixed values are persisted via `chrome.storage.sync`
