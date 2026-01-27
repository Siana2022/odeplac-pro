'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, MessageSquare, Send } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function AIPage() {
  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Asistente IA - ODEPLAC PRO</h1>
        <Sparkles className="h-6 w-6 text-zinc-400" />
      </div>

      <div className="flex-1 overflow-hidden flex flex-col border rounded-lg bg-zinc-50 dark:bg-zinc-900">
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          <div className="flex justify-start">
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-sm max-w-[80%] border">
              <p className="text-sm font-medium mb-1">ODEPLAC IA</p>
              <p className="text-sm">Hola, soy tu asistente de ODEPLAC. ¿En qué puedo ayudarte hoy? Puedo analizar tarifas, redactar memorias o consultar el estado de tus obras.</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-950 border-t">
          <div className="flex space-x-2">
            <Input placeholder="Escribe tu consulta aquí..." className="flex-1" />
            <Button size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
