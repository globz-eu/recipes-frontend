import { fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { jsonResponse, makeHomePage, makeRecipe } from "../support/fixtures"
import { renderWithQuery } from "../support/render"
import { HomeContent } from "../../../src/components/HomeContent"

vi.mock("../../../src/config", () => ({ getConfig: () => ({ apiBaseUrl: "https://cms.example" }) }))

function stubEmptyRecipes() {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ locales: {} })))
}

afterEach(() => vi.unstubAllGlobals())

describe("HomeContent", () => {
  it("shows the title and description of each home page", async () => {
    stubEmptyRecipes()
    const pages = [makeHomePage(), makeHomePage({ title: "More", description: "Second" })]
    renderWithQuery(<HomeContent pages={pages} locale="en" onLocaleChange={() => {}} />)

    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual([
      "Recipes",
      "More",
    ])
    expect(screen.getByText("Family favourites")).toBeInTheDocument()
    expect(screen.getByText("Second")).toBeInTheDocument()
    await screen.findByText("No recipes yet.")
  })

  it("omits a missing description", async () => {
    stubEmptyRecipes()
    const pages = [makeHomePage({ description: null })]
    const { container } = renderWithQuery(
      <HomeContent pages={pages} locale="en" onLocaleChange={() => {}} />,
    )

    expect(container.querySelector(".home-description")).toBeNull()
    await screen.findByText("No recipes yet.")
  })

  it("passes language changes to the caller", async () => {
    stubEmptyRecipes()
    const onLocaleChange = vi.fn()
    renderWithQuery(<HomeContent pages={[]} locale="en" onLocaleChange={onLocaleChange} />)

    fireEvent.click(screen.getByRole("button", { name: "NL" }))

    expect(onLocaleChange).toHaveBeenCalledExactlyOnceWith("nl")
    await screen.findByText("No recipes yet.")
  })

  it("lists the recipes of the current locale", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ locales: { de: [makeRecipe({ locale: "de" })] } })),
    )
    renderWithQuery(<HomeContent pages={[]} locale="de" onLocaleChange={() => {}} />)

    expect(await screen.findByRole("link", { name: "Pancakes" })).toBeInTheDocument()
  })
})
