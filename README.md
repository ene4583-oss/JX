# Jian Xu Stamping Workspace

Version **2026.10.15.7**. Node.js, HTML, JavaScript and MySQL. No Java installation is required.

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
