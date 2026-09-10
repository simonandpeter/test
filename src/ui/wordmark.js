/**
 * The masthead, as outlines rather than as text.
 *
 * **Generated — do not edit.** `python scripts/make_wordmark.py` rebuilds it
 * from src/fonts/gfs-nicefore.woff2, and the script is the place to change the
 * words, the face or the tracking.
 *
 * The stamp face is the only one here that is not preloaded, and it is the only
 * one at `font-display: swap` — so a cold load printed the masthead in Literata
 * and swapped it a moment later (author, 2026-08-28: "Daily Dox still sometimes
 * opens with literata on loading screen and title before updating to the new
 * font"). A path has no loading window at all.
 *
 * **It draws AGIOS and it is named Daily Dox, on purpose** (author, 2026-09-10).
 * The mark is the mockup's, in the mockup's own display face; the accessible
 * name is the site's, which the PWA manifest, the README and the `<title>`
 * split all still carry. `scripts/make_wordmark.py` argues both.
 *
 * The geometry is base.css's: 0.04em between adjacent glyphs, and the gap
 * between two words, if there are ever two again, is a space set at 0.5em.
 * `fill: currentColor` keeps it following the ink it sits in, and the viewBox
 * scales it to whatever font-size its box is given.
 */
export const WORDMARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -700 3037.00 900" style="height:0.9em" role="img" aria-label="Daily Dox" focusable="false" class="brand-mark"><g transform="scale(1 -1)" fill="currentColor"><path transform="translate(0.00 0)" d="M699 23C668 24 646 28 631 35C620 40 610 51 599 66H598C587 83 552 165 494 313L410 530C384 572 333 593 258 593C235 593 214 591 194 587L191 561C222 560 245 556 260 548C272 542 283 531 293 516C294 515 299 501 308 476C317 451 322 438 322 438C241 367 183 313 148 275C72 193 34 127 34 76C34 55 40 37 52 22C79 -12 121 -17 178 8C221 27 270 60 323 109C366 148 395 179 411 203C440 129 463 80 479 55C506 13 558 -8 633 -8C656 -8 677 -6 698 -2C698 -9 700 3 699 23ZM398 239C371 200 338 163 297 130C251 91 212 71 181 71C162 71 148 79 137 94C112 131 129 186 190 261C226 306 274 354 334 405Z"/><path transform="translate(744.00 0)" d="M630 213C631 222 628 228 622 232C617 233 613 235 608 237C601 240 547 240 446 239C446 224 446 216 446 216C476 215 496 212 505 207C508 204 512 198 516 189C517 187 518 179 518 166C501 62 450 14 353 14C234 14 174 101 174 275C174 359 183 422 201 465C228 530 278 563 350 563C437 563 492 512 514 411L627 412C608 467 573 510 522 543C472 576 414 592 347 592C272 592 208 572 156 533C85 480 50 398 50 287C50 200 81 128 142 70C201 13 272 -15 355 -15C422 -15 476 6 518 47C517 18 517 2 517 -2C517 -3 553 -3 626 -2C627 83 629 155 630 213Z"/><path transform="translate(1434.00 0)" d="M208 553C208 564 195 578 187 582C179 585 125 585 26 584C26 569 26 561 26 561C55 560 74 557 83 552C88 550 92 544 95 534C96 531 97 453 97 300C97 133 97 33 96 1C96 0 133 0 206 1V277C206 366 207 458 208 554V553Z"/><path transform="translate(1745.00 0)" d="M655 289C656 382 628 456 573 511C518 566 446 594 355 594C266 594 194 566 138 510C82 455 54 381 54 289C54 203 86 131 150 72C211 16 284 -12 368 -12C451 -12 519 15 573 70C627 125 654 198 655 289ZM532 286C533 219 521 161 496 111C465 48 421 17 364 17C241 17 180 107 180 286C179 472 238 565 355 565C420 565 466 539 494 486C519 441 531 374 532 286Z"/><path transform="translate(2487.00 0)" d="M354 203C381 184 394 157 394 122C394 106 391 90 384 74C371 38 327 15 282 15C269 15 257 17 246 21C219 29 197 47 178 76C162 101 152 130 148 161L45 115C51 90 67 67 93 44C136 6 196 -13 273 -13C332 -13 381 -4 421 14C480 41 509 86 506 149C503 243 422 311 263 354C190 374 153 408 150 456C147 485 156 511 177 532C199 555 230 567 270 566C343 565 384 519 393 427L491 454C476 502 452 537 418 558C383 582 332 594 267 595C210 596 160 582 119 554C76 524 54 485 54 436C54 419 57 401 63 384C73 353 95 327 130 306C147 297 184 281 241 259C291 240 329 221 354 203Z"/></g></svg>`;

/** The wordmark's aspect, so a caller can size it by height alone. */
export const WORDMARK_RATIO = 3.3744;
