import * as React from "react"
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Toaster } from "sonner"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { CommandPalette } from "@/components/CommandPalette"
import { Home } from "@/pages/Home"
import { Compress } from "@/pages/Compress"
import { Converter } from "@/pages/Converter"
import { PngToWebp } from "@/pages/PngToWebp"
import { ExifRemover } from "@/pages/ExifRemover"
import { QrGenerator } from "@/pages/QrGenerator"
import { MemeCropper } from "@/pages/MemeCropper"
import { PdfToWord } from "@/pages/PdfToWord"
import { ImagesToPdf } from "@/pages/ImagesToPdf"
import { MergePdf } from "@/pages/MergePdf"
import { PdfToImages } from "@/pages/PdfToImages"
import { About } from "@/pages/About"
import { Legal } from "@/pages/Legal"
import { NotFound } from "@/pages/NotFound"

function ScrollToTop() {
  const { pathname } = useLocation()
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
  }, [pathname])
  return null
}

function Shell() {
  const location = useLocation()
  const reduce = useReducedMotion()
  const [paletteOpen, setPaletteOpen] = React.useState(false)

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Header onOpenPalette={() => setPaletteOpen(true)} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <main id="main" className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
          >
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/compress-image" element={<Compress />} />
              <Route path="/image-converter" element={<Converter />} />
              <Route path="/png-to-webp" element={<PngToWebp />} />
              <Route path="/exif-remover" element={<ExifRemover />} />
              <Route path="/qr-generator" element={<QrGenerator />} />
              <Route path="/meme-cropper" element={<MemeCropper />} />
              <Route path="/pdf-to-word" element={<PdfToWord />} />
              <Route path="/images-to-pdf" element={<ImagesToPdf />} />
              <Route path="/merge-pdf" element={<MergePdf />} />
              <Route path="/pdf-to-images" element={<PdfToImages />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Legal kind="privacy" />} />
              <Route path="/terms" element={<Legal kind="terms" />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <Toaster
        position="bottom-right"
        closeButton
        toastOptions={{
          classNames: {
            toast:
              "!rounded-[12px] !border !border-border !bg-card !text-foreground !shadow-[var(--shadow-lift)] !font-sans",
            description: "!text-muted-foreground",
            actionButton: "!bg-primary !text-primary-foreground",
            closeButton: "!bg-card !border-border !text-muted-foreground",
          },
        }}
      />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  )
}
