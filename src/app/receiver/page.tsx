"use client";
import dynamic from "next/dynamic";

const ReceiverClient = dynamic(() => import("./receiver-client"), { ssr: false });

export default function Page() {
    return <ReceiverClient />;
}
