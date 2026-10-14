# CounterKeep 0.2.0 for Windows

Windows 10/11 x64 installers built from the private CounterKeep repository, source commit `ea15eae`. The NSIS installer was installed and launched on the development Windows machine. A separate clean-machine Windows 10/11 test matrix has not been performed.

## Included

- Local sales, inventory, contacts, purchases, cash register, documents, reports and repair work orders
- AppSumo-code activation or import of a signed, device-bound `.cklicense`
- Native Ed25519 verification and Windows Credential Manager persistence
- One Windows device per lifetime plan license
- Offline business operations after activation, with a best-effort connected status check on startup
- Bundled Microsoft WebView2 offline installer

## Important

The installers are **not Authenticode-signed**. Windows may show an unverified-publisher warning. The license file has a cryptographic signature; that is different from a Windows publisher signature.

The EXE and MSI are approximately 212 MB because they include WebView2. Card payment methods are recorded, not processed. Generated PDFs are not certified electronic tax invoices, and complete `.ckbackup` restoration is not implemented.

A permanently offline device cannot receive an immediate license revocation. Device transfers, email corrections and approved refund revocations require support at familiazv2016@gmail.com.

## SHA-256

- `CounterKeep_0.2.0_x64-setup.exe`: `c797f0baa00d0c2e132ef8312350f9bd5a742977c3a713536d967ab14a0e87ed`
- `CounterKeep_0.2.0_x64_en-US.msi`: `c9c2c4b5d9a18d0352af4af0214863f27735df83e95fa0fd5314adcaad4e1a0d`

Verify the downloaded file against `SHA256SUMS.txt` in this release. Checksums confirm integrity against this release, not verified publisher identity.
