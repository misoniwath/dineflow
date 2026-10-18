"use client";
import type { ComponentType, ReactNode } from "react";
import { AuthProvider } from "@/stores/AuthStore";
import { InventoryProvider } from "@/stores/InventoryStore";
import { FloorProvider } from "@/stores/FloorStore";
import { ReservationProvider } from "@/stores/ReservationStore";
import { OrderProvider } from "@/stores/OrderStore";

type Provider = ComponentType<{ children: ReactNode }>;

function composeProviders(...providers: Provider[]) {
  return function ComposedProviders({ children }: { children: ReactNode }) {
    return (
      <>
        {providers.reduceRight<ReactNode>(
          (acc, Provider) => (
            <Provider>{acc}</Provider>
          ),
          children,
        )}
      </>
    );
  };
}

export const AppProvider = composeProviders(
  InventoryProvider,
  FloorProvider,
  ReservationProvider,
  AuthProvider,
  OrderProvider,
);
