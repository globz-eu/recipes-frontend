import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

describe("test setup", () => {
  it("renders React into jsdom", () => {
    render(<p>hello</p>)
    expect(screen.getByText("hello")).toBeInTheDocument()
  })
})
