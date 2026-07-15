// Assembles every locale into one catalog: { en: {...}, ru: {...}, … }.
// To add a language: create `<code>.js` here, then import and add it below.
import en from './en'
import bg from './bg'
import cs from './cs'
import da from './da'
import de from './de'
import et from './et'
import el from './el'
import es from './es'
import fr from './fr'
import hr from './hr'
import it from './it'
import lv from './lv'
import lt from './lt'
import hu from './hu'
import nl from './nl'
import nb from './nb'
import pl from './pl'
import pt from './pt'
import ro from './ro'
import ru from './ru'
import sk from './sk'
import sl from './sl'
import fi from './fi'
import sv from './sv'
import uk from './uk'

export default {
  en, bg, cs, da, de, et, el, es, fr, hr, it, lv, lt, hu,
  nl, nb, pl, pt, ro, ru, sk, sl, fi, sv, uk,
}
