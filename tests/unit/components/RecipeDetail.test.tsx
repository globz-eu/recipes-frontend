import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { RecipeDetail } from "../../../src/components/RecipeDetail"
import { makeRecipe } from "../support/fixtures"

describe("RecipeDetail", () => {
  it("shows the title", () => {
    render(<RecipeDetail recipe={makeRecipe({ title: "Pancakes" })} />)

    expect(screen.getByRole("heading", { level: 2, name: "Pancakes" })).toBeInTheDocument()
  })

  it("lists ingredients with quantity, unit and name, skipping empty parts", () => {
    const ingredients = [
      { quantity: 200, unit: "g", name: "flour" },
      { quantity: 2, unit: "", name: "eggs" },
      { quantity: null, unit: "", name: "salt" },
    ]
    render(<RecipeDetail recipe={makeRecipe({ ingredients })} />)

    const items = screen.getAllByRole("listitem").map((item) => item.textContent)
    expect(items).toEqual(["200 g flour", "2 eggs", "salt"])
  })

  it("omits the ingredients section when there are none", () => {
    render(<RecipeDetail recipe={makeRecipe({ ingredients: [] })} />)

    expect(screen.queryByRole("heading", { name: "Ingredients" })).not.toBeInTheDocument()
  })

  it("renders the preparation as HTML", () => {
    const preparation = "<p>Mix <b>well</b>.</p><ol><li>Fry</li></ol>"
    render(<RecipeDetail recipe={makeRecipe({ preparation })} />)

    expect(screen.getByRole("heading", { name: "Preparation" })).toBeInTheDocument()
    expect(screen.getByText("well").tagName).toBe("B")
    expect(screen.getByRole("listitem")).toHaveTextContent("Fry")
  })

  it("omits the preparation section when empty", () => {
    render(<RecipeDetail recipe={makeRecipe({ preparation: "" })} />)

    expect(screen.queryByRole("heading", { name: "Preparation" })).not.toBeInTheDocument()
  })
})

describe("RecipeDetail meta", () => {
  it("shows servings, preparation and cooking time", () => {
    const recipe = makeRecipe({ number_of_people: 4, preparation_time: 15, cooking_time: 90 })
    render(<RecipeDetail recipe={recipe} />)

    expect(screen.getByText("Serves").nextSibling).toHaveTextContent("4")
    expect(screen.getByText("Preparation").nextSibling).toHaveTextContent("15 min")
    expect(screen.getByText("Cooking").nextSibling).toHaveTextContent("1 h 30 min")
  })

  it("formats whole hours without minutes", () => {
    render(<RecipeDetail recipe={makeRecipe({ cooking_time: 120 })} />)

    expect(screen.getByText("Cooking").nextSibling).toHaveTextContent(/^2 h$/)
  })

  it("shows a zero value but hides missing ones", () => {
    render(<RecipeDetail recipe={makeRecipe({ preparation_time: 0 })} />)

    expect(screen.getByText("Preparation").nextSibling).toHaveTextContent("0 min")
    expect(screen.queryByText("Serves")).not.toBeInTheDocument()
    expect(screen.queryByText("Cooking")).not.toBeInTheDocument()
  })

  it("renders no meta list when nothing is set", () => {
    render(<RecipeDetail recipe={makeRecipe()} />)

    expect(screen.queryByText("Serves")).not.toBeInTheDocument()
    expect(screen.queryByText("Cooking")).not.toBeInTheDocument()
  })
})

describe("RecipeDetail meta durations", () => {
  it("formats minutes below an hour and hours with minutes", () => {
    render(<RecipeDetail recipe={makeRecipe({ preparation_time: 45, cooking_time: 90 })} />)

    expect(screen.getByText("Preparation").nextSibling).toHaveTextContent(/^45 min$/)
    expect(screen.getByText("Cooking").nextSibling).toHaveTextContent(/^1 h 30 min$/)
  })
})
