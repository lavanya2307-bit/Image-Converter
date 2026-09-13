# Image Converter

A polished browser-based workspace for common image and PDF workflows.

## Tools
- Guide
- Convert — JPG, JPEG, PNG and WEBP output; batch download as ZIP
- Image to PDF — multiple images, ordering, page size and orientation
- PDF Merge — multiple PDF files, reorder, merge and download one PDF
- HD Quality — 1080p, 2K, 4K or custom dimensions
- ZIP Viewer — open ZIP archives or inspect a selected folder, preview supported images and download entries

## Notes
- Image/PDF processing is performed in the browser.
- Original files are not overwritten.
- PDF merge uses PDF-Lib and supports standard unencrypted PDFs.
- ZIP Viewer uses JSZip and extracts entries only when previewed or downloaded.
- Server-side registration/activity logging and owner portal remain included.

## Run
```powershell
npm.cmd install
npm.cmd start
```
Then open `http://localhost:3000`.


## Deployment architecture

### User portal
`index.html` is the public user-facing application. It contains only the tools needed by users:
Guide, Convert, Image to PDF, PDF Merge, HD Quality, and ZIP Viewer.

### Private owner portal
`owner.html` is a separate owner-only portal. It has no navigation link from the user portal.
The dashboard is protected by server-side session authentication and reads user/activity data only after authentication.

### Data storage
When the Node/Express server is running, registrations and activity are stored in SQLite (`DB_PATH`).
For a hosted deployment, use persistent server storage/database; an ephemeral filesystem can lose SQLite data after restarts/redeploys.

### GitHub Pages
GitHub Pages can host the browser-side user portal, but it cannot execute `server.js`.
Therefore the public GitHub Pages copy cannot provide server-side registration persistence, owner authentication, SQLite storage, or email notifications by itself.
For the complete public + private system, deploy the Node/Express application from this same repository on a server host with persistent storage.


## Final runtime rule
Run this project through Node/Express (`npm install` then `npm start`) for registration sync, activity storage, owner login, SQLite persistence, and email notifications. GitHub Pages can host the static UI, but it cannot execute `server.js`; therefore the admin/data features require the Node service URL.
