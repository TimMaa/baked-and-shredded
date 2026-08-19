/// <reference lib="WebWorker" />
import { precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

// Navigation requests use network-first so new deployments are picked up immediately
registerRoute(new NavigationRoute(new NetworkFirst({
  cacheName: "pages",
})));

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
