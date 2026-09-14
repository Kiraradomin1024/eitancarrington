import Link from "next/link";
import type { NpcStatus, RelationType } from "@/lib/types";
import { RELATION_INK } from "@/lib/ink";

/**
 * Une ligne écrite à la main : « Kirara — amie, celle que j'appelle en
 * premier ». Le mot du lien est souligné avec le trait de son type.
 * Je n'écris pas « intensité 4 ».
 */
export function RelationLine({
  type,
  name,
  href,
  status,
  description,
}: {
  type: RelationType;
  name: string;
  href: string;
  status: NpcStatus;
  description: string | null;
}) {
  const ink = RELATION_INK[type];
  const dead = status === "dead";
  const gone = status === "gone";

  return (
    <li className="break-words">
      <Link
        href={href}
        className={
          "hover:underline underline-offset-4 " +
          (dead ? "text-pen-black" : gone ? "text-pen-grey line-through decoration-2" : "text-ink")
        }
      >
        {name}
      </Link>
      <span className="text-ink-faint"> — </span>
      {dead ? (
        <span
          className="text-pen-black"
          style={{ borderBottom: "2px solid var(--pen-black)" }}
        >
          {description ? description : "rien à écrire"}
        </span>
      ) : (
        <>
          <span
            style={{
              textDecorationLine: "underline",
              textDecorationStyle: ink.decoration,
              textDecorationColor: ink.color,
              textDecorationThickness: ink.decoration === "double" ? "1.5px" : "2px",
              textUnderlineOffset: "5px",
            }}
          >
            {ink.word}
          </span>
          {description && (
            <span className="text-ink-soft">, {description}</span>
          )}
        </>
      )}
    </li>
  );
}
