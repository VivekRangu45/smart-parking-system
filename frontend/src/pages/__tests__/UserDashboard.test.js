import { render, screen } from "@testing-library/react";
import UserDashboard from "../UserDashboard";

test("renders User Dashboard heading", () => {
  render(<UserDashboard />);
  expect(screen.getByText(/User Dashboard/i)).toBeInTheDocument();
});
