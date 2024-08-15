const fs = require('fs')
const colors = require('colors')
const { DownloaderHelper } = require('node-downloader-helper')

// Function to download the TSV file with retry and resume support
function downloadTsvFile(url, filePath) {
    return new Promise((resolve, reject) => {
        const downloader = new DownloaderHelper(url, '.', {
            fileName: filePath,
            retry: { maxRetries: 3, delay: 5000 },
            override: true,
        })

        downloader.on('end', () => {
            console.log(
                colors.green(`File downloaded and saved as ${filePath}`)
            )
            resolve()
        })

        downloader.on('error', (err) => {
            console.error(colors.red('Download failed:'), err)
            reject(err)
        })

        downloader.on('retry', (attempt, error, totalRetries) => {
            console.log(
                colors.yellow(
                    `Retrying download... Attempt ${attempt} of ${totalRetries}`
                )
            )
        })

        downloader.start().catch((err) => {
            console.error(colors.red('Failed to start download:'), err)
            reject(err)
        })
    })
}

// Function to load the eligibility list from TSV file
function loadEligibilityList(filePath) {
    return new Promise((resolve, reject) => {
        const eligibilitySet = new Map()
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject(err)
            } else {
                const rows = data.split('\n')
                // Skip the header row
                for (let i = 1; i < rows.length; i++) {
                    const columns = rows[i].split('\t')
                    if (columns.length >= 2) {
                        const address = columns[0].trim()
                        const allocation = columns[1].trim()
                        eligibilitySet.set(address.toLowerCase(), allocation)
                    }
                }
                resolve(eligibilitySet)
            }
        })
    })
}

// Function to load wallet addresses
function loadWalletAddresses(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject(err)
            } else {
                const walletAddresses = data
                    .split('\n')
                    .map((line) => line.trim())
                resolve(walletAddresses)
            }
        })
    })
}

// Function to check eligibility and log eligible addresses
async function checkEligibility(eligibilityFilePath, walletAddressesFilePath) {
    try {
        // Check if the eligibility file exists, if not, download it
        if (!fs.existsSync(eligibilityFilePath)) {
            console.log(
                colors.yellow(
                    `${eligibilityFilePath} not found. Downloading...`
                )
            )

            // tsv file
            await downloadTsvFile(
                'https://www.dropbox.com/scl/fi/g1ecwukr4mc26wf9rdpt1/TokenAllocationS1_4.tsv?rlkey=gmsars1ktoxty4syuelmxpnyl&st=cytq7ehc&dl=1',
                eligibilityFilePath
            )
        }

        const eligibilitySet = await loadEligibilityList(eligibilityFilePath)
        const walletAddresses = await loadWalletAddresses(
            walletAddressesFilePath
        )

        walletAddresses.forEach((address) => {
            const lowerAddress = address.toLowerCase()
            if (eligibilitySet.has(lowerAddress)) {
                const allocation = eligibilitySet.get(lowerAddress)
                console.log(
                    colors.green(`${address} - Token Allocation: ${allocation}`)
                )
                fs.appendFileSync(
                    'eligible_addresses.txt',
                    `${address}\t${allocation}\n`
                )
            } else {
                // console.log(colors.red(`${address} is not eligible`));
            }
        })
    } catch (error) {
        console.error(colors.red('Error:'), error)
    }
}

// Paths to your files
const eligibilityFilePath = 'TokenAllocationS1_4.tsv'
const walletAddressesFilePath = 'wallet_addresses.txt'

// Check eligibility
checkEligibility(eligibilityFilePath, walletAddressesFilePath)
