import WidgetKit
import SwiftUI
import AppIntents

extension TelcelUsageEntry: TimelineEntry {}

public enum CarrierIntentChoice: String, AppEnum {
    case auto = "auto"
    case telcel = "telcel"
    case bait = "bait"
    case att = "att"
    case movistar = "movistar"

    public static var typeDisplayRepresentation: TypeDisplayRepresentation = "Operador"
    public static var caseDisplayRepresentations: [CarrierIntentChoice: DisplayRepresentation] = [
        .auto: "Predeterminado (App)",
        .telcel: "Telcel",
        .bait: "Bait",
        .att: "AT&T",
        .movistar: "Movistar"
    ]

    public var mobileCarrier: MobileCarrier? {
        MobileCarrier(rawValue: rawValue)
    }
}

// MARK: - 1. AppIntents para Configuración y Recarga Interactiva desde el Widget (iOS 17+)
struct TelcelWidgetConfigIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Configuración del Widget"
    static var description = IntentDescription("Selecciona tu operador o usa el predeterminado de la app.")

    @Parameter(title: "Operador", default: .auto)
    var carrier: CarrierIntentChoice

    @Parameter(title: "Número (10 dígitos)", default: "")
    var phone: String

    @Parameter(title: "Contraseña / Token", default: "")
    var passwordOrToken: String
}

struct RefreshTelcelUsageIntent: AppIntent {
    static var title: LocalizedStringResource = "Actualizar Consumo"

    @Parameter(title: "Operador")
    var carrier: String?

    init() {}
    init(carrier: String?) {
        self.carrier = carrier
    }

    func perform() async throws -> some IntentResult {
        let c = carrier.flatMap { MobileCarrier(rawValue: $0) }
        _ = await TelcelNetworkService.shared.fetchUsage(carrier: c, forceRefresh: true)
        WidgetCenter.shared.reloadTimelines(ofKind: "MiTelcelUsageWidget")
        return .result()
    }
}

// MARK: - 2. TimelineProvider
struct MiTelcelTimelineProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> TelcelUsageEntry {
        .sample
    }

    func snapshot(for configuration: TelcelWidgetConfigIntent, in context: Context) async -> TelcelUsageEntry {
        TelcelUsageEntry.sample(for: configuration.carrier.mobileCarrier ?? TelcelNetworkService.selectedCarrier)
    }

    func timeline(for configuration: TelcelWidgetConfigIntent, in context: Context) async -> Timeline<TelcelUsageEntry> {
        let entry = await TelcelNetworkService.shared.fetchUsage(
            carrier: configuration.carrier.mobileCarrier,
            overridePhone: configuration.phone,
            overridePassword: configuration.passwordOrToken,
            overrideToken: configuration.passwordOrToken
        )
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: .now)!
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }
}

// MARK: - 3. Vista SwiftUI (Total Plan + Promo, Consumo y Fecha de Corte)
public struct MiTelcelWidgetView: View {
    public var entry: TelcelUsageEntry

    public init(entry: TelcelUsageEntry) {
        self.entry = entry
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            MiTelcelWidgetCardContent(entry: entry)

            if !entry.isError {
                Spacer(minLength: 8)

                Button(intent: RefreshTelcelUsageIntent(carrier: entry.carrier)) {
                    Text(entry.footerText)
                        .font(.system(size: 11, weight: .regular))
                        .foregroundStyle(Color(red: 0.60, green: 0.60, blue: 0.62))
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
                .buttonStyle(.plain)
            }
        }
        .containerBackground(Color(red: 0.07, green: 0.07, blue: 0.07).opacity(0.1), for: .widget)
    }
}

// MARK: - 4. Configuración Principal del Widget
@main
struct MiTelcelUsageWidget: Widget {
    let kind: String = "MiTelcelUsageWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: TelcelWidgetConfigIntent.self, provider: MiTelcelTimelineProvider()) { entry in
            MiTelcelWidgetView(entry: entry)
        }
        .configurationDisplayName("Consumo Móvil")
        .description("Muestra los GB disponibles, consumo y vigencia/corte de tu operador (Telcel, Bait, AT&T o Movistar).")
        .supportedFamilies([.systemSmall])
    }
}
