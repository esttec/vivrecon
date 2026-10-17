package com.vivrecon.api

import org.springframework.http.ResponseEntity
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.*
import java.math.BigDecimal
import java.time.LocalDate

/** Investment / trading journal: plain rows, profit is calculated in the app. */
data class PositionRequest(
    val kind: String, val asset: String, val direction: String = "LONG",
    val openDate: String, val closeDate: String? = null,
    val qty: BigDecimal, val openPrice: BigDecimal, val closePrice: BigDecimal? = null,
    val fees: BigDecimal = BigDecimal.ZERO, val note: String? = null,
)

@RestController
@RequestMapping("/api/positions")
class PositionController(private val jdbc: JdbcTemplate) {

    @GetMapping
    fun list(@RequestParam kind: String): List<Map<String, Any?>> =
        jdbc.queryForList(
            """SELECT id, kind, asset, direction, to_char(open_date, 'YYYY-MM-DD') AS "openDate", to_char(close_date, 'YYYY-MM-DD') AS "closeDate", qty,
               open_price AS "openPrice", close_price AS "closePrice", fees, note
               FROM positions WHERE user_id = ? AND kind = ? ORDER BY open_date DESC, id DESC""",
            currentUserId(), kind)

    @PostMapping
    fun create(@RequestBody r: PositionRequest): ResponseEntity<Void> {
        val p = valid(r)
        jdbc.update("""INSERT INTO positions (user_id, kind, asset, direction, open_date, close_date, qty, open_price, close_price, fees, note)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?)""", currentUserId(), *p)
        return ResponseEntity.noContent().build()
    }

    @PutMapping("/{id}")
    fun update(@PathVariable id: Long, @RequestBody r: PositionRequest): ResponseEntity<Void> {
        val n = jdbc.update("""UPDATE positions SET kind=?, asset=?, direction=?, open_date=?, close_date=?, qty=?, open_price=?,
                               close_price=?, fees=?, note=? WHERE id=? AND user_id=?""", *valid(r), id, currentUserId())
        return if (n == 1) ResponseEntity.noContent().build() else ResponseEntity.notFound().build()
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ResponseEntity<Void> {
        jdbc.update("DELETE FROM positions WHERE id=? AND user_id=?", id, currentUserId())
        return ResponseEntity.noContent().build()
    }

    private fun valid(r: PositionRequest): Array<Any?> {
        require(r.kind == "INVEST" || r.kind == "TRADE") { "Unknown kind" }
        require(r.direction == "LONG" || r.direction == "SHORT") { "Unknown direction" }
        require(r.asset.isNotBlank()) { "Asset is required" }
        require(r.qty.signum() > 0 && r.openPrice.signum() >= 0) { "Quantity and price must be positive" }
        val open = LocalDate.parse(r.openDate)
        val close = r.closeDate?.takeIf { it.isNotBlank() }?.let(LocalDate::parse)
        require(close == null || !close.isBefore(open)) { "Close date is before open date" }
        require((close == null) == (r.closePrice == null)) { "Closed positions need a close price" }
        return arrayOf(r.kind, r.asset.trim().take(120), r.direction, open, close, r.qty, r.openPrice,
            r.closePrice, r.fees, r.note?.take(255))
    }
}
