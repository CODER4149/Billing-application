import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.borewell.erp",
  appName: "Borewell ERP",
  webDir: "../../packages/web/dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: "Library/CapacitorDatabase",
      androidIsEncryption: false,
    },
  },
};

export default config;
