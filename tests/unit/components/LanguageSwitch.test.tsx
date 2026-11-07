import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { LanguageSwitch } from "../../../src/components/LanguageSwitch"

describe("LanguageSwitch", () => {
  it("offers every supported language", () => {
    render(<LanguageSwitch locale="en" onChange={() => {}} />)

    const labels = screen.getAllByRole("button").map((button) => button.textContent)
    expect(labels).toEqual(["EN", "DE", "FR", "NL"])
  })

  it("marks only the current language as pressed", () => {
    render(<LanguageSwitch locale="fr" onChange={() => {}} />)

    expect(screen.getByRole("button", { name: "FR" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "false")
  })

  it("reports the clicked language", () => {
    const onChange = vi.fn()
    render(<LanguageSwitch locale="en" onChange={onChange} />)

    fireEvent.click(screen.getByRole("button", { name: "DE" }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith("de")
  })
})
