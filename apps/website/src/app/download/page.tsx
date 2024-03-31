import { AppIcon } from "@/components/app-icon";
import { BlurryCircle } from "@/components/blurry-circle";
import { CopyInput } from "@/components/copy-input";
import { Button } from "@midday/ui/button";
import type { Metadata } from "next";
import Image from "next/image";
import panelLight from "public/panel-light.png";
import panel from "public/panel.png";

export const metadata: Metadata = {
  title: "Download | Midday",
};

export default function Page() {
  return (
    <div className="container flex flex-col items-center mb-12 md:mb-48 text-center">
      <BlurryCircle className="absolute top-[40%] -right-6 bg-[#F59F95]/30 dark:bg-[#F59F95]/10 -z-10 hidden md:block" />
      <BlurryCircle className="absolute top-[70%] left-0 bg-[#3633D0]/10 dark:bg-[#3633D0]/10 -z-10 hidden md:block" />

      <h1 className="mt-24 font-medium text-center text-5xl mb-24">
        Always at your fingertips.
      </h1>

      <div className="relative">
        <Image
          src={panel}
          alt="Download Midday"
          width={1223}
          height={462}
          className="z-10 relative hidden dark:block"
          quality={100}
          priority
        />

        <Image
          src={panelLight}
          alt="Download Midday"
          width={1223}
          height={462}
          className="z-10 relative dark:hidden"
          quality={100}
          priority
        />

        <BlurryCircle className="absolute bottom-[50px] -left-6 bg-[#A1F5CD]/5" />
        <BlurryCircle className="absolute bottom-0 right-[150px] bg-[#FFECBB]/5" />
      </div>
      {/* <Image
        src={appIcon}
        alt="Midday App"
        width={120}
        height={120}
        quality={100}
        className="w-[80px] h-[80px] mt-12 md:mt-0 md:h-auto md:w-auto"
      /> */}

      <AppIcon />

      <p className="mb-4 text-2xl	font-medium mt-8">Midday for Mac</p>
      <p className="text-[#878787] font-sm max-w-[500px]">
        With Midday on Mac you have everything <br />
        accessible just one click away.
      </p>

      <a href="https://go.midday.ai/d" download>
        <Button
          variant="outline"
          className="border border-primary h-12 px-6 mt-8"
        >
          Download
        </Button>
      </a>

      <p className="text-xs text-[#878787] mt-4">
        Supports apple silicon & intel
      </p>

      <CopyInput
        value="curl -sL https://go.midday.ai/d | tar -xz"
        className="max-w-[410px] mt-8 font-mono font-normal"
      />
    </div>
  );
}
