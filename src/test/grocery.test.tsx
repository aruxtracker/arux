import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GroceryPage } from "@/pages/GroceryPage";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrowserRouter } from "react-router-dom";

describe("GroceryPage", () => {
  it("renders GroceryPage without crashing and navigates between tabs", () => {
    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <GroceryPage currency="₹" />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(container).toBeTruthy();
    expect(screen.getByText(/Grocery & Pantry/i)).toBeInTheDocument();

    // Switch to Shopping List tab
    const shoppingListTab = screen.getByRole("button", { name: /Shopping List/i });
    fireEvent.click(shoppingListTab);

    // Switch to Stock Tracker tab
    const stockTrackerTab = screen.getByRole("button", { name: /Stock Tracker/i });
    fireEvent.click(stockTrackerTab);
    expect(screen.getByPlaceholderText(/Search pantry/i)).toBeInTheDocument();

    // Switch to Low Stock tab
    const lowStockTab = screen.getByRole("button", { name: /Low Stock/i });
    fireEvent.click(lowStockTab);

    // Switch to Flatmates tab
    const flatmatesTab = screen.getByRole("button", { name: /Flatmates/i });
    fireEvent.click(flatmatesTab);
  });
});
