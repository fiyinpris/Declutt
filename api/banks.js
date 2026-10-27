/* GET /api/banks — Nigerian banks (from Paystack) for the seller's payout account form. */
import { handle, paystack } from "./_lib/server.js";

export default handle(["GET"], async (req, res) => {
  const banks = await paystack("/bank?country=nigeria&currency=NGN&perPage=200");
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
  res.status(200).json({
    banks: banks
      .filter((b) => b.active !== false)
      .map((b) => ({ name: b.name, code: b.code }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  });
});
