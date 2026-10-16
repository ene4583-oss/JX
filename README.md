# Jian Xu Stamping Workspace

Version **2026.10.15.7**. Node.js, HTML, JavaScript and MySQL. No Java installation is required.

## Start on Windows

1. Install Node.js 22 or later and start MySQL.
2. Extract this project and double-click `start-windows.bat`.
3. Keep the startup window open. It installs dependencies on the first run and opens the website.
4. On first use, enter your MySQL connection details in the local setup page. If no account exists, create an administrator with a password of at least 8 characters.
5. Sign in and open **Products & Scan** or **Excel Import**.

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

- **Products & Scan** starts with no records. Search by old/new registration number, customer name, address, serial, brand or Model, or scan a QR. Results show Name, Full address, Registration No., Brand and Model with Details, QR / Reprint, Edit and Add to print queue actions. On phones, the same fields stack vertically. Open Details for the remaining fields and history.
- Scanning displays the matching product for review. Choose **Add to print queue** explicitly; paired phones send the product to the computer at that point. Product Excel export is under **More tools**.
- **Add product / customer** supports manual entry. Choose an existing customer or enter a new one. **Add customer only** creates a customer without a product on the same page. Search results include matching customers; there is no separate Customers page.
- Use **Edit customer** on a product row, or **Edit customer for all products** in Details, to change the shared name, address, area and phone once. All products linked to that customer immediately use those details, including items already in this device’s print queue. Product IDs and QR links stay the same; existing saved PDFs retain their historical snapshots.
- Each product receives a permanent UUID and QR. Updates retain that UUID. Serial-number matching uses customer, brand, Model and serial; products without a serial cannot always be matched across different files.
- **Print Queue** has company, date and an optional record title above collapsible type groups (ATN, ATS, ATE, etc.). Bill No., Branch and Total Price are no longer requested. Select products within each group, then use **Preview [type] PDF** or **Save [type] PDF** to generate only that type. Each group save creates a separate record, even while editing an existing form.
- **Combined PDF / List Format for all selected types** holds the optional combined printing controls. Group checkboxes select only that type; **Select all types** and **Deselect all types** apply to the whole queue. Only selected rows are saved or printed.
- Edit and remove actions remain on the left. Removing a queued product does not delete the product library record.
- Choose **B — New** or **L — Used** for condition. The List Format prints B/L; official DE/MCM forms use their original checkbox values.
- Stamping fees and sticker serials are entered per product. Fees appear in the separate List Format with page subtotals and a final total.
- Phone and tablet layouts show priority columns. Open a row to view all fields and change the fee for the current print.
- **Saved Forms** provides DE/MCM PDF, List Format PDF and Excel exports. Staff can edit or delete their own forms; administrators can manage all forms. Saved form corrections do not change the product library.
- **Website Settings** contains the logo preview/upload and deployed website URL. Logos are stored in MySQL and survive restarts.

The website interface, prompts and API errors are in English. Customer data and official uploaded DE/MCM templates retain their original language.

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

**Excel Import → Download master Excel** downloads `JX-Master-Records.xlsx` with the same 18 headers. It contains:

- Original historical rows from every remaining import batch.
- Manually created or edited product records, including products retained after their import was cleared.
- Explicitly added customer-only records that do not yet have products.

The website builds the latest cumulative workbook when downloaded. Each new import or manual entry is included automatically; you do not need to merge downloaded workbooks. Browsers do not silently overwrite a workbook on your computer. Save or replace the downloaded file in your chosen folder.

Different historical visits remain separate rows, even when they refer to one product. Manual current-product rows are additional to original imported history. Phone numbers and serials are exported as text to retain leading zeros; fees are numeric.

**Clear batch** removes one file's imported history and stored original workbook. **Clear all imports** applies this to all batches. Both require administrator access and an explicit confirmation. Download the master first if you need a copy.

Only unused products known to have been created by imports are removed. Products referenced by another import, saved form, active scanning session or manual product edit are kept. Manually created products and explicitly added customers are kept. New imported customers are removed only when no product references them and they have not been edited. Older data with uncertain customer ownership is retained conservatively. Clearing a batch does not reverse changes to a retained product or change saved PDFs.

Old import batches are indexed automatically the first time this page is opened. Preparing a large older workbook may take time; keep the page open.

The master workbook is limited to 200,000 rows. Product-library and saved-form exports have separate 20,000-row limits.

## Phone testing and remote use

For a local test, connect the phone and computer to the same Wi-Fi, keep the computer running and use the phone URL shown by the website or startup window. Do not use localhost on the phone. Allow Node.js on private networks in Windows Firewall. Use the phone's camera to open the product QR, sign in and read the product details. The QR dialog also shows a copyable product link.

Browser camera access requires HTTPS. Remote staff on other Wi-Fi or mobile data need a publicly deployed HTTPS website; saving a public URL alone does not deploy the server. Reprint labels that point to an old localhost/LAN address when moving to the permanent URL. Product UUIDs stay the same.

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

Default connection: localhost:3307, root with an empty password, database `jianxu_node_test`. Override with `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD` and `TEST_DB_NAME`. Never use a production database. Batch tests create and drop a uniquely named `jx_batch_*_test` database and require permission for those test databases.

Tests cover authentication, permissions, CSRF, QR identities, phone pairing, PDF generation, source-column recovery, large uploads, master export and protected batch clearing. Browser checks cover manual entry, product tables, batch clearing, master downloads and phone/tablet/desktop layouts. Physical phone cameras, printers and public hosting still need checks in the actual deployment environment.
