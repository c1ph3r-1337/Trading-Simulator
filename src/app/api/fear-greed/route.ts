import { NextResponse } from "next/server";

export async function GET() {
    const r = await fetch(
        "https://api.alternative.me/fng/?limit=1&format=json",
        {
            cache: "no-store",
        }
    );
    if (!r.ok)
        return NextResponse.json({ error: "upstream error" }, { status: 500 });

    const json = await r.json();
    const item = json?.data?.[0];
    return NextResponse.json({
        value: Number(item?.value ?? 0),
        label: item?.value_classification ?? "Neutral",
        raw: item,
    });
}
