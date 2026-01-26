'use client'

import { useState } from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { BudgetPDF } from './BudgetPDF'
import { Button } from '@/components/ui/button'
import { FileText, Loader2 } from 'lucide-react'

export function PDFDownloadButton({ obra, items }: { obra: any, items: any[] }) {
  const [show, setShow] = useState(false)

  if (!show) {
    return (
      <Button variant="outline" onClick={() => setShow(true)}>
        <FileText className="mr-2 h-4 w-4" /> Generar PDF
      </Button>
    )
  }

  return (
    <PDFDownloadLink
      document={<BudgetPDF obra={obra} items={items} />}
      fileName={`Presupuesto_${obra.titulo.replace(/\s+/g, '_')}.pdf`}
    >
      {({ blob, url, loading, error }) =>
        loading ? (
          <Button disabled variant="outline">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparando...
          </Button>
        ) : (
          <Button variant="default">
            <FileText className="mr-2 h-4 w-4" /> Descargar PDF
          </Button>
        )
      }
    </PDFDownloadLink>
  )
}
