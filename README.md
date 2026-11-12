# Jian Xu Stamping Workspace

Version **2026.11.12.16**. Node.js, HTML, JavaScript and MySQL. No Java installation is required.

## Start on Windows

1. Install Node.js 22 or later and start MySQL.
2. Extract this project and double-click `start-windows.bat`.
3. Keep the startup window open. It installs dependencies on the first run and opens the website.
4. On first use, enter your MySQL connection details in the local setup page. If no account exists, create an administrator with a password of at least 8 characters.
5. Sign in and open **Products & Scan** or **Management → Excel Import**.

The alternative launcher `启动网站.bat` performs the same action. Run only one launcher.

To create or reset the local administrator, close the website process and run `set-admin-password.bat`. Press Enter to use `admin`, enter the new password twice, then restart the website. Password input is hidden. This does not delete business data.

When updating, close the old startup window, copy the updated files over the project and **keep `backend/.env`**. Restart and press Ctrl+F5. The header must show the new version; an old-backend message means an older process is still running.

On macOS or Linux:

```sh
npm run install:app
npm start
```

For local password recovery:

```sh
cd backend
npm run admin:password
```

## Products, customers and printing

**Products & Scan** defaults to products added in the current browser tab/session, including after a refresh. Older products appear only when searched or scanned. Partial searches update automatically; **×** clears the search. Rows show Name, Address, Brand, Model, Registration No., B/L, Shop/Out and Stamping Fee, with only **Edit**, **QR** and **Add to Print** actions.

**Add Product** is the shared customer/product form. Enter customer name, phone, address and area, then type, brand, Model, serial, capacity, one registration number and fee. Shop/Out and New/Old are radio options. There is no separate Add Customer button or suggested-company input. Search by part of a customer name or registration (including its numeric portion), choose an existing product to fill all details, or choose a customer to add another product. New manual text is stored in uppercase; phone/registration leading zeros remain strings. Changing shared customer details updates all linked products. A scanned product QR opens its populated edit form; saving retains the same product identity and QR. Individual QR downloads are JPG. Bulk label printing remains under **Bulk print QR** (up to 500 labels, 12 per A4 page).

In **Print Queue**, choose the stamping date, DE/MCM and List Title. Type buttons appear only for types present in the queue. **Print [type]** and **Print List** generate PDFs only: they do not create completed records or update products. Enter new registration numbers and fees inline, or use Edit for other changes.

**Save & Update** is the separate completion action (up to 50 selected products). It creates an immutable historical snapshot/PDF and updates the linked products' current registration, stamping date and details in one transaction. The previous registration is retained in the snapshot/old-registration field, and the permanent QR loads the latest live product. Stale product/customer versions are rejected instead of overwriting another employee's work. Any failure rolls the whole completion back. A retry with the same request ID does not complete twice.

**Complete Record** shows one row per product visit, supports From/To date filtering, and exports all matching records to one `JX-Saved-Records.xlsx` using the existing 2025 columns. Older saved forms remain in history. Each row has PDF access; **More** retains List PDF, owner/admin batch correction and deletion. Batch correction is explicitly labelled **Save record correction** and changes only that historical batch, not current product/QR details. Deleting a saved batch also keeps current products. Repeated downloads are complete current workbooks, not appended duplicates; replace the old local copy when the browser numbers duplicate filenames.

Administrators can edit/delete the shared customer from the product form. Customer deletion is recoverable and hides linked products from live search/QR; historical records and original import history remain. Restore via **More tools → Deleted customers**. **Management** combines Excel Import, Staff Accounts, Website Settings and logo upload.

## Borang Template

Administrators select **DE/MCM + product type**, then upload a blank PDF background (up to 20MB / 20 pages). Upload one type per file: its first page receives field values; remaining pages are included unchanged as back pages. PDF page dimensions must be 100–2,000 points per side. Existing historical PDFs are never rewritten by an upload.

The editor renders the actual first page. Choose a field or checkbox, click the page to place it, or adjust X/Y/Width/Height (PDF points from the top-left) and text font size (5–48). Fields can be added or removed. **Preview filled PDF** tests draft coordinates before saving; **Save positions** makes them active. The editor uses locally served PDF.js and needs no external viewer service. Replacing a background rescales initial coordinates; review and calibrate them for the new form. Template uploads/layout changes are version checked to avoid silent overwrites. Backgrounds and coordinates are stored in MySQL and survive program updates. For larger PDFs MySQL may require `max_allowed_packet=64M`.

## Excel import

Only unencrypted `.xlsx` files are supported: **30MB and 50,000 data rows** per file, plus the header. Convert `.xlsb` or `.xls` using Excel's Save As command; renaming the extension does not convert a file.

The original 2025 workbook headers are retained:

`Date`, `Name`, `Address`, `Area`, `Type`, `Baru/Lama`, `Brand`, `Model`, `S/No`, `Capacity`, `No. Daftar Lama`, `No. Daftar Baru`, `Shop/Out`, `Stamping Fee`, `Phone No.`, `No. Bill`, `Total Price`, `Caw`.

Header matching ignores common spacing and capitalization differences. Chinese Model aliases and `Phone number` are supported. The required headers are Name, Address, Type, Brand and S/No. Empty cells remain empty.

1. Select the workbook and company rule.
2. Click **Check file** to inspect recognized columns and non-empty source counts.
3. Keep **Fill missing fields in existing imports** selected to repair earlier imports without duplicating their history.
4. Click **Import file**. The result includes counts read back from the database.

Later empty cells do not erase earlier populated fees or condition. Non-empty manual corrections are preserved. Unknown product types need confirmation before printing: SIC maps to SLC; ATP_M maps to ATP (M); other unknown types remain unconfirmed. CRA registration numbers suggest MCM; other products suggest DE. The printing company can still be changed each time.

Large original files are stored using binary parameters. If MySQL's packet capacity is too small, the application asks for `max_allowed_packet=64M`; update the MySQL server configuration and restart MySQL and the website.

## Import batches and one master workbook

**Management → Excel Import → Download master Excel** downloads `JX-Master-Records.xlsx` with the same 18 headers. It contains:

- Original historical rows from every remaining import batch.
- Manually created or edited product records, including products retained after their import was cleared.
- Explicitly added customer-only records that do not yet have products.

The website builds the latest cumulative workbook when downloaded. Each new import or manual entry is included automatically; you do not need to merge downloaded workbooks. Browsers do not silently overwrite a workbook on your computer. Save or replace the downloaded file in your chosen folder.

Different historical visits remain separate rows, even when they refer to one product. Manual current-product rows are additional to original imported history. Phone numbers and serials are exported as text to retain leading zeros; fees are numeric.

**Clear batch** removes one file's imported history and stored original workbook. **Clear all imports** applies this to all batches. Both require administrator access and an explicit confirmation. Download the master first if you need a copy.

Only unused products known to have been created by imports are removed. Products referenced by another import, saved form, active scanning session or manual product edit are kept. Manually created products and explicitly added customers are kept. New imported customers are removed only when no product references them and they have not been edited. Older data with uncertain customer ownership is retained conservatively. Clearing a batch does not reverse changes to a retained product or change saved PDFs.

Old import batches are indexed automatically the first time this page is opened. Preparing a large older workbook may take time; keep the page open.

The imported/manual master workbook and cumulative saved-form workbook each allow up to 200,000 rows. Product-library exports have a separate 20,000-row limit.

## Phone testing and remote use

For a local test, connect the phone and computer to the same Wi-Fi, keep the computer running and use the phone URL shown by the website or startup window. Do not use localhost on the phone. Allow Node.js on private networks in Windows Firewall. Use the phone's camera to open the product QR, sign in and read the product details. The QR dialog also shows a copyable product link.

**Scan QR → Choose from photos / files** or **Take a photo** can read a QR photo or screenshot on the device even on the HTTP Wi-Fi test site. On supported phones, the file picker offers the rear camera; otherwise choose an existing image. Use this for the pairing QR first, then product QRs, and choose Add to print queue to send to the paired computer. Manual link entry is optional and collapsed. Live browser camera access still requires HTTPS. Remote staff on other Wi-Fi or mobile data need a publicly deployed HTTPS website; saving a public URL alone does not deploy the server. Reprint labels that point to an old localhost/LAN address when moving to the permanent URL. Product UUIDs stay the same.

## Production deployment

The repository includes Docker Compose, MySQL 8.4 and Caddy for HTTPS.

1. Point a domain or subdomain to a server and allow ports 80/443. Do not publicly expose MySQL or the application port.
2. Copy root `.env.example` to `.env` and set the domain, separate database passwords, initial administrator password and a random session secret of at least 32 characters.
3. Run:

```sh
docker compose up -d --build
```

For a separate Node deployment, use `backend/.env.example`. Set `NODE_ENV=production`, `COOKIE_SECURE=true`, `PUBLIC_BASE_URL=https://your-domain` and the correct database connection. `TRUST_PROXY=1` is only appropriate behind one trusted reverse proxy. Database TLS uses `DB_SSL=true` and an optional trusted `DB_SSL_CA` file.

Production uses `PUBLIC_BASE_URL` from the environment as its authoritative address and disables the local setup wizard. Keep `SESSION_SECRET` stable across restarts. Customer data, sessions, QR identities, logos and PDFs are stored in MySQL.

Back up the database and test restoration. Do not run `docker compose down -v`: it deletes the database volume. Do not commit `.env`, credentials, customer workbooks or database backups.

## Validation

```sh
npm --prefix backend ci
npm --prefix backend test
```

MySQL integration tests require an isolated test database:

```sh
RUN_MYSQL_TESTS=true npm --prefix backend test
```

Default connection: localhost:3307, root with an empty password, database `jianxu_node_test`. Override with `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD` and `TEST_DB_NAME`. Never use a production database. Batch/workflow tests create and drop uniquely named `jx_batch_*_test` / `jx_workflow_*_test` databases and require permission for those test databases.

Tests cover authentication, permissions, CSRF, QR identities, phone pairing, PDF generation, source-column recovery, large uploads, master export and protected batch clearing. Browser checks cover manual entry, product tables, batch clearing, master downloads and phone/tablet/desktop layouts. Physical phone cameras, printers and public hosting still need checks in the actual deployment environment.

ATN, ATS and BTU writing positions are calibrated for DE and MCM, with fixed baselines when text shrinks. Existing saved PDFs retain their old placement; edit and save a form again to regenerate it with the corrected positions.

The login form defaults to **Remember me on this device for 30 days**. It stores a persistent HttpOnly session cookie, not a browser-stored password. Closing/reopening the browser or restarting the website keeps the session when the same browser, hostname and SESSION_SECRET are used. The 30-day limit is fixed from login; signing out, changing the password, or disabling the account revokes access. Unchecking Remember me uses a 12-hour login. Existing sessions keep their prior lifetime; sign in once with Remember me to use the new duration.

## Upload controls and phone receipt status (2026.11.05.2)

Administrators can open **Products & Scan → More tools → Upload / Delete Excel records**, or **Management → Excel Import**. **Check file** shows the first five normalized rows so the file can be checked before import. **Uploaded files** shows filename, upload time, source-row/product counts and uploader. **Delete upload** names the specific file in its confirmation and clears that batch's raw rows/unused imported products; manual, edited, shared, saved or queued products remain protected. This is not a rollback of edits to pre-existing products. Imported records enter the library and are found through search, rather than appearing as newly keyed session products.

The visible phone sync bar distinguishes local-only additions, sending, waiting for the receiving computer, confirmed receipt and connection errors. **Phone / Computer connection** opens setup from any main page; **Refresh connection** retries immediately. The computer must select a receiving session created on that browser/origin. Phone and computer can use different employee accounts, but must pair with the computer's QR and access the same running server/database. On a replacement computer, use its current LAN URL (with :3000), refresh both devices, and create a fresh pairing rather than relying on an old browser/session.

The receiving computer retries transient failures and timed-out requests. Per-product delivery versions permit sending the same product again after removal/completion, while receiver acknowledgements prevent old deliveries being re-added merely because the computer page is reloaded. The phone's success message means the receiving browser has stored/acknowledged the product; server-only delivery remains visibly pending until the computer is open and connected. Saved form edits and the Save & Update completion behavior are unaffected.

## Named devices and scan choices (2026.11.11.1)

The scanner has separate **Choose from photos / files** (no camera-capture attribute) and **Take a photo** (rear-camera capture where the phone supports it) inputs. Both decode locally and work on the HTTP LAN test site. **Start live camera (HTTPS)** is a separate optional action, so merely opening the scanner does not immediately request live-camera permission. An unreadable photo can be retried, and closing the scanner cancels navigation from a pending image decode. Manual link entry remains optional.

Scan within the signed-in website to stay in the same browser/origin rather than opening a different in-app browser. The default Remember me login remains valid for 30 days; logout, password changes, account disabling, expiry, browser cookie removal or changing hostnames can require signing in again. The scanner shows the current signed-in account and session expiry. No employee password is stored in a QR or browser storage.

Use **Phone / Computer connection → This device name** on each device, such as Office PC and Alice Android. The current receiving session shows its computer and phone names, employee accounts, last contact and presence, with a compact peer summary on every main page. Devices are Online when the server has seen them within 90 seconds; otherwise they are Not recently active. A network failure is shown as Checking connection rather than falsely reporting a peer as online. Mobile browsers may stop heartbeats while suspended, so presence measures recent app contact, not Wi-Fi signal strength.

New pairings are remembered for 30 days and survive browser/server restarts, separately from their five-minute one-use setup codes. Older pairings retain their prior expiry until re-paired. Phone presence uses authenticated, token-verified heartbeats every 15 seconds, and receiver polling updates computer presence. A pairing is bound to the employee who accepted it. Online/foreground events reconnect promptly, transient failures retry, and a late receiver acknowledgement is checked again during phone heartbeats. The phone continues to distinguish waiting-for-receipt from confirmed receipt. Select the intended receiving session when several sessions exist; this view shows the currently selected computer/phone connection.

## Photo QR recognition and two-way queues (2026.11.11.2)

**Choose from photos / files** no longer filters by filename or MIME type. JPG/JPEG/JPE/JFIF, PNG, GIF, BMP, WebP, SVG and AVIF use browser image decoding. TIFF and HEIC/HEIF have local converters; files are not uploaded. Images can be up to 50MB. Unsupported/damaged images receive a specific error. The QR reader tries the original image at several resolutions, normal and inverted codes, and overlapping crops for small labels in a large phone photo. Work runs in local workers so the page remains usable. This improves recognition; a blurred, obscured or glare-covered QR may still need a closer photo. Live video still requires HTTPS, while selected/taken photos work on LAN HTTP.

Old QR labels containing another computer address, localhost or a former domain can be scanned **inside the signed-in website**: only the product ID/pair token is extracted and all authenticated requests go to the current server. The scanner never navigates to or sends credentials to the QR's original host. Opening an old URL directly with another camera app still needs that old address to be reachable; reprint labels after changing the website URL.

Both paired screens now send **Add to Print** and explicit queue removals to a shared, ordered operation stream. Each screen polls every two seconds while open, saves its received position, and acknowledges only after storing the queue. Retrying a send uses the same request ID, and a disconnected receiver catches up after reconnecting. Save & Update sends removal of completed products as well. Existing unrelated local rows are kept; adding/removing products after pairing is synchronized. Historical-record correction temporarily pauses incoming queue changes. Draft field edits, print selection checkboxes and PDF previews remain local until Save & Update; this is not remote control of the other browser. New shared queue products are protected when clearing Excel imports while their pairing is active.

Update the backend and refresh **both** browsers. Existing valid pairings can be reused. Both devices must use the same running server/database; keep both websites open for immediate receipt. The phone layout switches rows to labelled cards below 760px, fits dialogs within the viewport, and uses readable 16px form fields.

Local vendor libraries: jsQR 1.4.0 (Apache-2.0), heic2any 0.0.4 (MIT), UTIF 3.1.0 (MIT) and pako 1.0.11 (MIT/Zlib). Licenses are included in `frontend/vendor`. The heic2any embedded worker is extracted to `heic-worker.js`; its converter's dynamic code is permitted only by that worker response's CSP. Page scripts retain the strict CSP without `unsafe-eval`.

## ATN picture choices (2026.11.12.1)

DE and MCM ATN products now show small selectable reference illustrations for **Instrument type** (Pedestal / Suspended) and **Tray type** (Bowl / Flat), in both product entry/editing and the Print Queue edit dialog. The illustrations come from the supplied MCM ATN form. Click either the picture or its label; a selected card is highlighted. Each field also allows Not entered. The product form shows these fields only for ATN. Previously saved unrecognized values remain selectable so editing does not silently erase them.

Stored values remain `Pedestal` / `Suspended` and `Mangkuk` / `Rata`, matching the existing DE/MCM PDF checkbox mappings. Product saves retain the selection; editing a queue row applies it to that form until Save & Update. Existing database tables need no changes. The compact 64px illustrations fit mobile and desktop screens.

## Malay form entry (2026.11.12.2)

Staff product/customer entry, per-product print editing and print settings use Malay labels matching the DE/MCM forms: Jenama, Nama Pembuat, Had Terima, Senggatan, Kegunaan Alat and Penentusahan Terakhir. ATN picture choices remain available as Jenis Alat and Bentuk Dulang. SLL uses Nilai Jangkaan and Kategori Alat, and SLL/ATL show their Malay inspection questions with Ya/Tidak answers.

Kegunaan Alat is a radio choice of Perdagangan, Bukan Perdagangan or Tidak diisi. Only form types with that field show it. All nine types expose their relevant form fields when adding/editing a product; the field/checkbox lists come from the existing PDF layouts. Material/shape/indicator choices follow the options in that type's form. Other fields remain editable, and unrecognized previously saved option values remain selectable. Hidden fields are disabled for submission, while existing details are preserved when editing another type.

These are display and input changes. SQL field names, stored option values, original PDFs and the 2025 Excel import/export column headings are unchanged. No database migration is required. Restart the backend and refresh both browsers after updating.

## English workspace and live filtering (2026.11.12.3)

Products & Scan and Print Queue use English headings, actions, table columns, print settings and status messages. Entry dialogs also have English instructions/actions, while their actual form field labels and choices remain Malay, including Jenama, Kegunaan Alat and the ATN picture choices. PDF form backgrounds and stored data remain unchanged.

The Products & Scan search filters automatically after a short pause while typing part of a customer name, registration, address, brand or model; no Search button is needed. A filtering indicator and inline hint explain the behavior. Older responses cannot replace newer queries, and clearing the input restores the products added in this session. Enter remains supported, and other search inputs keep their existing behavior.

## Customer matching correction (2026.11.12.4)

The requested automatic matching is in **Add Product → Customers**, not the main Products & Scan filter. Typing part of a customer name or registration now shows clickable customer/product matches directly below that input. Find and the collapsed results select are hidden; selecting a customer fills shared details for a new product, while selecting a product loads its existing record. Results refresh after a short typing pause, older requests are ignored, clearing X removes matches, and no-match feedback leaves manual entry available. Up to 12 matches are shown, with customer choices kept visible alongside product matches.

Products & Scan and Print Queue wording/layout are restored to the prior Malay-form release. Only the **Print Queue** Shop / Out column uses English; the product-list equivalent keeps Kedai / Luar. Form fields, ATN pictures, stored records and PDF backgrounds remain unchanged. This supersedes the broader workspace language change in 2026.11.12.3.

## Six counterpoise entries and full-view scanning (2026.11.12.5)

ATP (M), for both DE and MCM, has six separate numbered Nilai Berat Kaunterpois (kg) inputs in product entry/editing and the Print Queue form editor. Blank middle/leading slots retain their positions. Existing newline-separated data remains compatible; saving and PDF preview preserve numbered positions, and PDF output uses the six original form lines. No SQL migration is needed. Old values with more than six lines are shown for review rather than silently truncated; review them before producing a six-line form.

On a secure HTTPS site (or localhost), Scan QR automatically asks for camera access and scans the whole video frame, without a central alignment box or taking a photo. Start / retry live camera remains available after a permission/start failure. The stream requests the rear camera at up to 1920×1080; actual resolution depends on the device. Closing the scanner cancels detection and releases the camera even during startup. The bundled html5-qrcode renderer now handles the expected media-play AbortError during cleanup, while preserving other errors.

Photo/file selection and the Take a photo shortcut are grouped in one full-width panel. Uploaded/taken photos are searched at multiple scales and nine overlapping crop positions, with a high-resolution fallback. No manual on-screen white-frame alignment is required. Live camera access is still blocked by browsers on ordinary LAN HTTP addresses; those addresses continue to support file/camera-photo recognition. Blurry, obstructed or extremely small codes may still require moving closer or taking a clearer image.

## English interface, Malay form content (2026.11.12.6)

Page/dialog headings, buttons, table columns and general operation messages use English. Actual form entry fields, choices, inspection questions and form-filling guidance remain Malay as requested. This supersedes the broader language changes documented above. Six counterpoise inputs, live customer matching, photo/file controls, full-view QR scanning, stored data and PDF backgrounds are preserved.

## Product fields, import defaults and clean reset (2026.11.12.7)

Add Product customer search now shows one unified row format: **Name → No. Daftar → Brand → Address**. Products use their latest available registration (new before old). A separate duplicate customer row is suppressed when matching products already represent that customer; customers without matching products still appear in the same format. No Customer: prefix is shown.

Shop/Out offers S or O only; blank/unrecognized uploads default to O (legacy Shop/Kedai means S). The fee label is Penentusahan fee. These fields follow the other options at the bottom. Keadaan Alat uses Baru/Lama radio choices; Kegunaan Alat and ATN picture choices no longer have Tidak diisi. Senggatan sits beside Had Terima. Manufacturer, previous verification date/branch and internal notes are hidden/disabled in entry dialogs without deleting existing values.

Product entry shows No. Daftar Lama; it is populated from new_reg when present, otherwise old_reg. New registration entry remains available in Print Queue completion/Complete Record editing. Excel imports map No. Daftar Baru, or No. Daftar Lama when Baru is blank, into the product's old_reg with imported new_reg blank. Reupload repairs older import mappings without duplicating products/history; manually edited and completed product state is protected. Existing saved form snapshots are unchanged. Import/export column names stay in the 2025 format.

Administrators can use **Management → Excel Import → Start again with a clean record list → Clear all records**. After confirmation this transaction deletes customers, products, Excel uploads/history, Complete Record forms/PDFs and pairing queues, and clears the current browser's queue. Staff accounts, login sessions, logo, website settings, PDF backgrounds/layouts and audit history are retained. Failures roll back the deletion. Reimport is immediately available. **Old product QR labels stop working after a full clear and must be reprinted**; other open devices should refresh and pair again. The reset is never run automatically during update/startup. Tests exercise deletion only in isolated test databases.

## Entry, scanning and table layout (2026.11.12.8)

Phone scanning/device pairing settings now live in **Management**. Employees can open this connection panel; Excel Import, Staff Accounts, Website Settings and their APIs remain administrator-only. The compact global delivery/connection status remains visible while working.

Add Product has no separate Cari search line. Typing into **Nama Tuan Punya** automatically finds partial name/registration matches below the name/phone row. Choosing a match retains the existing customer/product fill behavior. Enter new customer remains available to unlink the selected customer and continue manual entry. Kawasan in product/customer editing has a filtered dropdown from existing, non-deleted customer areas; clicking a result or using arrows/Enter completes it. New area text remains allowed.

Scan QR prioritizes **Take photo & read QR**, opening the phone's native rear-camera capture where supported. Upload and explicit Live scan are alternatives; camera permission is no longer requested automatically. Photo decoding now has a ZXing 0.21.3 fallback in addition to jsQR, trying normal/inverted luminance and two thresholding methods. Both run locally in the image worker. The Apache-2.0 license is included in frontend/vendor. A successfully decoded QR pointing to a deleted/nonexistent product now explicitly explains that new labels are needed after clearing/re-importing records. Live camera still requires HTTPS (or localhost); ordinary LAN HTTP supports native camera photos and files. Recognition depends on image clarity and the code being intact.

Print Queue and Complete Record wrap all columns without horizontal table dragging. Smaller viewports use fully expanded labelled rows. Queue checkboxes remain first; Edit/QR/Remove actions are last. Completed-record PDF/list/edit/delete actions are directly visible in the last column. Editable registration fields grow vertically rather than hiding text in a small scrolling input. There is no change to saved PDF backgrounds or record contents.

## Shared devices and individual completed records (2026.11.12.9)

Connected Devices supports five devices total, including the creator. Create one pairing QR and scan it on the other devices within five minutes. Each device has its own row and × control: the group creator can remove other devices, and other members can disconnect themselves. For this update, create a new pairing QR and reconnect devices; existing product QR labels remain valid. Scanned, selected and manually added products accumulate in a shared list. Adding/removing Print Queue items synchronizes in both directions, while merely scanning does not queue a product. A disconnected device catches up when it reconnects.

Staff Accounts accepts short usernames and passwords, including one character; passwords remain hashed. The first-use administrator setup and local recovery utility retain their existing policies.

Queue and completed-record fields use wider labelled layouts that wrap to fit the screen. Customer matching results float directly below the name field. **Complete** replaces **Save & Update**. The queue's New Reg field starts blank: completing without a new number keeps the current registration; entering a new number updates the live product for subsequent visits.

Completed-record Excel exports use one **No. Pendaftaran** column with the completed registration (falling back to the old number). Product-library exports keep their existing columns. The completed workbook can also be imported again.

Each Complete Record row has its own **Edit** and **Delete** buttons. These affect only that historical record and do not overwrite the live product. Editing one item from a saved batch splits it into its own saved form, retaining the other items and their original PDF pages. Concurrent corrections are rejected when the underlying record changed. Deleting a completed record keeps the live product.

Update by retaining `backend/.env`, restarting the website, and refreshing every connected browser. Additional device tables are created automatically; no data reset is required.

## Scan error, clear list and compact tables (2026.11.12.10)

Fixed the undefined `reg` reference that prevented existing products from opening after scanning or choosing a search match. Products & Scan provides **Clear scanned list** and a per-row **×**. These remove only the shared scanned/entered list entries; database products and Print Queue items remain. Clear actions synchronize to connected devices and remain cleared after reconnecting.

Print Queue and Complete Record use compact tables again on desktop: one product per row, all columns visible with wrapping, and actions at the end. Narrow phone screens retain a readable vertical layout without horizontal dragging.

## List counts and selection (2026.11.12.11)

Print type buttons show the total products for that type, or selected/total when rows are deselected. Products & Scan uses the same compact sizing as Print Queue. Products & Scan and Complete Record now have leading row checkboxes and a header checkbox to select/deselect the displayed rows; queue checkboxes continue controlling printing/completion. The top device status banner is hidden, while device management and background synchronization remain available.

## Remove completed products from the active list (2026.11.12.12)

After successful **Complete**, only the completed products leave both Print Queue and the current Products & Scan list, including connected devices. Unselected products remain. This does not delete the live product or completed record; searching/scanning it again retrieves the latest details. Failed completion and historical corrections do not clear the scan list.

The bulk **Clear scanned list** button has been removed. Per-row × remains available for an accidental scan.

## Automatic dates and customer-only entry (2026.11.12.13)

Changing either Complete Record date immediately filters the list and updates the Excel export link, without a Filter button. Date changes reset pagination; older requests cannot replace newer results.

In Add Product, **Save customer only** sits beside **Enter new customer**. It saves the name, phone, address and area without requiring product fields or creating a product/QR. The saved customer remains selected, so a product can be added immediately or later by searching the customer name. Saving an already selected customer updates that customer's shared details.

## Reuse a customer without copying their product (2026.11.12.14)

Selecting a name/registration match in Add Product fills only shared customer details (name, address, phone and area). It does not load the matched product, its ID, registration or instrument details, or add it to the scan list/queue. Enter and save the new product to link it to that customer. Existing products can still be edited from their row or opened by scanning their QR.

## Keep both matching actions (2026.11.12.15)

Selecting an existing product match again loads all its details for editing the same product/QR. Each product match also has a separate **Customer only** button, which selects shared customer details for a new product without copying the old product. When switching from an existing product to Customer only, the form becomes a new-product form. Customer-only matches and Save customer only remain available.

## Dedicated customer-first product entry (2026.11.12.16)

**Add new customer** in the Add Product customer section starts a blank new-product form with customer-only matching. Type part of a customer name or address in the name field: the list shows customer name, address and phone without product data. Selecting a customer fills shared customer fields; enter the new product details below and save to create a new product for that customer. With no match, enter the new customer details manually. Normal Add Product matching, product editing, QR scanning and Save customer only remain available.
