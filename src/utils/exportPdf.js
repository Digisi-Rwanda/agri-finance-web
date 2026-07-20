import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const BRAND = {
  primary: [0, 69, 13],
  text: [15, 23, 42],
  muted: [100, 116, 139],
}

export function slugifyFilename(value = 'report') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'report'
}

function formatConsent(value) {
  if (value === true) return 'ON'
  if (value === false) return 'OFF'
  return 'Unknown'
}

function savePdf(doc, filename) {
  const name = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  doc.save(name)
}

function addReportHeader(doc, title, subtitle) {
  doc.setFillColor(...BRAND.primary)
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Agri Trust', 14, 12)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(title, 14, 20)

  doc.setTextColor(...BRAND.muted)
  doc.setFontSize(9)
  const generated = new Date().toLocaleString()
  doc.text(`Generated ${generated}`, 14, 34)
  if (subtitle) {
    doc.text(subtitle, 14, 40)
    return 46
  }
  return 40
}

function addSectionTitle(doc, title, startY) {
  if (startY > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage()
    startY = 20
  }
  doc.setTextColor(...BRAND.text)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, startY)
  return startY + 4
}

function addKeyValueTable(doc, rows, startY) {
  autoTable(doc, {
    startY,
    head: [['Field', 'Value']],
    body: rows.map(([field, value]) => [field, value == null || value === '' ? '—' : String(value)]),
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: BRAND.primary, textColor: 255 },
    margin: { left: 14, right: 14 },
  })
  return doc.lastAutoTable.finalY + 8
}

function addDataTable(doc, headers, body, startY) {
  if (!body.length) {
    return addKeyValueTable(doc, [['Status', 'No records']], startY)
  }
  autoTable(doc, {
    startY,
    head: [headers],
    body,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: BRAND.primary, textColor: 255 },
    margin: { left: 14, right: 14 },
  })
  return doc.lastAutoTable.finalY + 8
}

export function exportTableReport({ title, subtitle, filename, headers, rows, rowMapper }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = addReportHeader(doc, title, subtitle)
  const headerLabels = headers.map((h) => h.label)
  const body = rows.map((row) => headers.map((h) => {
    const value = rowMapper ? rowMapper(row, h.key) : row[h.key]
    return value == null || value === '' ? '—' : String(value)
  }))
  addDataTable(doc, headerLabels, body, y)
  savePdf(doc, filename)
}

export function exportFarmerAnalysisReport({
  farmer,
  creditScore,
  creditRiskLevel,
  consentStatus,
  farms,
  yieldRecords,
  loans,
  paymentRows,
  transactions,
  formatAmount,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const fmt = formatAmount || ((v) => (v == null ? '—' : String(v)))

  let y = addReportHeader(
    doc,
    'Farmer Analysis Report',
    `${farmer.fullName} · ID ${farmer.farmerId}`,
  )

  y = addSectionTitle(doc, 'Profile', y)
  y = addKeyValueTable(doc, [
    ['Full name', farmer.fullName],
    ['Farmer ID', farmer.farmerId],
    ['Phone', farmer.phone],
    ['Email', farmer.email],
    ['Location', farmer.location],
    ['National ID', farmer.nationalId],
    ['Member since', farmer.registrationDate ? String(farmer.registrationDate).slice(0, 10) : ''],
  ], y)

  y = addSectionTitle(doc, 'Credit & consent', y)
  y = addKeyValueTable(doc, [
    ['Credit score', creditScore ?? '—'],
    ['Risk level', creditRiskLevel || '—'],
    ['Bank consent', formatConsent(consentStatus.bank)],
    ['Transactions consent', formatConsent(consentStatus.transactions)],
  ], y)

  y = addSectionTitle(doc, 'Farms', y)
  y = addDataTable(
    doc,
    ['Farm', 'Crop', 'Acreage', 'Irrigation', 'Location'],
    farms.map((farm) => [
      farm.name || `Farm #${farm.farmId}`,
      farm.cropType || '—',
      farm.acreage != null ? `${farm.acreage} ac` : '—',
      farm.irrigation ? 'Yes' : 'No',
      farm.location || '—',
    ]),
    y,
  )

  y = addSectionTitle(doc, 'Yield history', y)
  y = addDataTable(
    doc,
    ['Season', 'Year', 'Crop', 'Farm', 'Quantity'],
    yieldRecords.map((item) => [
      item.season || '—',
      item.year || '—',
      item.cropType || '—',
      item.farmName || `Farm #${item.farmId}`,
      item.quantity ?? '—',
    ]),
    y,
  )

  y = addSectionTitle(doc, 'Loans', y)
  y = addDataTable(
    doc,
    ['Purpose', 'Status', 'Amount', 'Interest', 'Loan ID'],
    loans.map((loan) => [
      loan.loanPurpose || 'General',
      loan.status || '—',
      fmt(loan.amount),
      loan.interestRate != null ? `${loan.interestRate}%` : '—',
      loan.loanId || '—',
    ]),
    y,
  )

  y = addSectionTitle(doc, 'Payments & MoMo', y)
  y = addDataTable(
    doc,
    ['Date', 'Type', 'Status', 'Amount'],
    paymentRows.map((row) => [row.date, row.type, row.status, row.amount]),
    y,
  )

  y = addSectionTitle(doc, 'Financial ledger', y)
  addDataTable(
    doc,
    ['Type', 'Date', 'Amount'],
    transactions.map((txn) => [
      txn.category || txn.description || 'Transaction',
      txn.transactionDate?.slice(0, 10) || '—',
      fmt(txn.amount),
    ]),
    y,
  )

  const filename = `${slugifyFilename(farmer.fullName)}-farmer-${farmer.farmerId}-report`
  savePdf(doc, filename)
}

/**
 * Spec v2 Feature 4 — professional loan package PDF for manual bank submission.
 * Distinct guarantee line item included when present.
 */
export function exportLoanPackagePdf(pkg) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = addReportHeader(
    doc,
    'Loan application package',
    pkg?.title || 'Digisi Agri Trust bankability file',
  )

  y = addSectionTitle(doc, '1. Application summary', y)
  y = addKeyValueTable(
    doc,
    [
      ['Package ID', pkg.packageId],
      ['Status', pkg.status],
      ['Submission method', pkg.submissionMethod],
      ['Suggested amount (RWF)', pkg.suggestedAmount],
      ['Duration (months)', pkg.suggestedDurationMonths],
      ['Repayment plan', pkg.suggestedRepaymentPlan],
      ['Collateral type', pkg.suggestedCollateralType],
      ['Generated', pkg.generatedAt],
    ],
    y,
  )

  y = addSectionTitle(doc, '2. Farmer', y)
  y = addKeyValueTable(
    doc,
    [
      ['Name', pkg.farmer?.fullName],
      ['Phone', pkg.farmer?.phone],
      ['Location', pkg.farmer?.location],
      ['Farmer ID', pkg.farmer?.farmerId],
    ],
    y,
  )

  y = addSectionTitle(doc, '3. Credit summary (bank-readable)', y)
  y = addKeyValueTable(
    doc,
    [
      ['Score snapshot', pkg.creditScoreSnapshot],
      ['Reasoning', pkg.reasoning],
    ],
    y,
  )

  y = addSectionTitle(doc, '4. Repayment schedule', y)
  const schedule = pkg.repaymentSchedule || {}
  const installments = Array.isArray(schedule.installments) ? schedule.installments : []
  y = addKeyValueTable(
    doc,
    [
      ['Monthly payment (RWF)', schedule.monthlyPayment],
      ['Months', schedule.months || pkg.suggestedDurationMonths],
      ['APR %', schedule.aprPercent],
      ['Total payable (RWF)', schedule.totalPayable],
      ['Plan summary', schedule.summary || pkg.suggestedRepaymentPlan],
    ],
    y,
  )
  if (installments.length) {
    y = addDataTable(
      doc,
      ['#', 'Amount due (RWF)', 'Status'],
      installments.map((row) => [row.period, row.amountDue, row.status || 'scheduled']),
      y,
    )
  }

  y = addSectionTitle(doc, '5. Collateral proof', y)
  const contracts = Array.isArray(pkg.contracts) ? pkg.contracts : []
  const receipts = Array.isArray(pkg.receipts) ? pkg.receipts : []
  y = addDataTable(
    doc,
    ['Type', 'ID', 'Detail', 'Status/Value'],
    [
      ...contracts.map((c) => [
        'Verified contract',
        c.contractId,
        c.buyerName,
        `${c.status} / ${c.contractValue ?? '—'}`,
      ]),
      ...receipts.map((r) => [
        'Warehouse receipt',
        r.receiptId,
        `${r.commodity} @ ${r.cooperativeName}`,
        `${r.status} / qty ${r.quantity}`,
      ]),
    ],
    y,
  )

  // Distinct guarantee line — must not be buried
  y = addSectionTitle(doc, '6. CREDIT GUARANTEE (BDF/RDB)', y)
  if (pkg.guarantee && (pkg.guarantee.guaranteeRequestId || pkg.guarantee.recommended)) {
    y = addKeyValueTable(
      doc,
      [
        ['Guarantee body', pkg.guarantee.body || 'BDF/RDB'],
        ['Coverage %', pkg.guarantee.coveragePercent],
        ['Status', pkg.guarantee.status],
        ['Reference number', pkg.guarantee.referenceNumber || 'Pending admin approval'],
        ['Recommendation', pkg.guarantee.reason],
      ],
      y,
    )
  } else {
    y = addKeyValueTable(doc, [['Guarantee', 'Not attached to this package']], y)
  }

  y = addSectionTitle(doc, '7. Partner bank', y)
  addKeyValueTable(
    doc,
    [
      ['Bank', pkg.bank?.bankName || 'Not selected'],
      ['Integration', pkg.bank?.integrationStatus || 'not_integrated'],
      ['Contact', pkg.bank?.contactInfo],
    ],
    y,
  )

  savePdf(doc, `loan-package-${pkg.packageId || 'draft'}`)
}

/** Bank export of farmers with verified purchase contracts. */
export function exportVerifiedFarmersPdf(payload) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = addReportHeader(
    doc,
    'Verified farmer records',
    payload?.title || 'Digisi Agri Trust — bank submission pack',
  )
  y = addKeyValueTable(
    doc,
    [
      ['Farmers', payload?.count],
      ['Generated', payload?.generatedAt],
    ],
    y,
  )
  const farmers = Array.isArray(payload?.farmers) ? payload.farmers : []
  y = addDataTable(
    doc,
    ['Farmer', 'Phone', 'Score', 'Risk', 'Verified contracts'],
    farmers.map((f) => [
      f.fullName || `#${f.farmerId}`,
      f.phone,
      f.creditScore,
      f.riskLevel,
      f.verifiedContracts,
    ]),
    y,
  )
  savePdf(doc, 'verified-farmers-export')
}
