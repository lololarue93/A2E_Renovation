"use client";
import { useEffect, useState } from "react";
import { priceItems, type PriceItem } from "@/lib/pricing/price-data";
export function usePricing() {
  const [catalog, setCatalog] = useState<PriceItem[]>(priceItems);
  const [pricingError, setPricingError] = useState("");
  const [pricingNotice, setPricingNotice] = useState("Chargement du catalogue. Base indicative de démonstration.");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/pricing", { cache: "no-store", signal: controller.signal }).then(async r => {
      if (!r.ok) throw new Error("Catalogue temporairement indisponible : les montants affiches sont une base de demonstration.");
      const data = await r.json(); if (!Array.isArray(data) || !data.length) throw new Error("Le catalogue est vide.");
      setCatalog(data); setPricingError(""); setPricingNotice(r.headers.get("x-pricing-source") === "demonstration" ? "Aperçu local : catalogue de démonstration, à valider avec A2E avant publication." : "Catalogue A2E administré · prix indicatifs à confirmer par devis.");
    }).catch(e => { if (e.name !== "AbortError") setPricingError(e.message); });
    return () => controller.abort();
  }, []);
  return { catalog, pricingError, pricingNotice };
}
