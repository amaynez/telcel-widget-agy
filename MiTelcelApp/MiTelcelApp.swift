import SwiftUI
import WidgetKit

@main
struct MiTelcelApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    @State private var carrier: MobileCarrier
    @State private var phone: String
    @State private var password: String
    @State private var token: String
    @State private var entry: TelcelUsageEntry
    @State private var isLoading = false

    init() {
        let initialCarrier = TelcelNetworkService.selectedCarrier
        _carrier = State(initialValue: initialCarrier)
        let creds = TelcelNetworkService.loadCredentials(for: initialCarrier)
        _phone = State(initialValue: creds.phone)
        _password = State(initialValue: creds.password)
        _token = State(initialValue: creds.token)
        _entry = State(initialValue: TelcelUsageEntry.sample(for: initialCarrier))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Preview Card del Widget
                    VStack(alignment: .leading, spacing: 0) {
                        MiTelcelWidgetCardContent(entry: entry)
                        if !entry.isError {
                            Spacer(minLength: 8)
                            Text(entry.footerText)
                                .font(.system(size: 11))
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                                .minimumScaleFactor(0.8)
                        }
                    }
                    .padding(16)
                    .frame(width: 170, height: 170)
                    .background(Color(red: 0.07, green: 0.07, blue: 0.07))
                    .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                    .shadow(radius: 8)

                    // Selector de Operador
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Operador Móvil")
                            .font(.headline)

                        Picker("Operador", selection: $carrier) {
                            ForEach(MobileCarrier.allCases) { c in
                                Text(c.displayName).tag(c)
                            }
                        }
                        .pickerStyle(.segmented)
                        .disabled(isLoading)
                        .onChange(of: carrier) { _, newCarrier in
                            switchCarrier(to: newCarrier)
                        }
                    }
                    .padding(.horizontal)

                    // Credenciales dinámicas por Operador
                    VStack(alignment: .leading, spacing: 10) {
                        switch carrier {
                        case .telcel:
                            Text("Cuenta Mi Telcel")
                                .font(.headline)
                            TextField("Número a 10 dígitos", text: $phone)
                                #if os(iOS)
                                .keyboardType(.numberPad)
                                .textContentType(.username)
                                .autocorrectionDisabled()
                                #endif
                                .textFieldStyle(.roundedBorder)
                            SecureField("Contraseña Mi Telcel", text: $password)
                                #if os(iOS)
                                .textContentType(.password)
                                #endif
                                .textFieldStyle(.roundedBorder)
                            Text("Tu número a 10 dígitos y contraseña del portal mitelcel.com.")
                                .font(.caption)
                                .foregroundStyle(.secondary)

                        case .bait:
                            Text("Línea Mi Bait")
                                .font(.headline)
                            TextField("Número a 10 dígitos", text: $phone)
                                #if os(iOS)
                                .keyboardType(.numberPad)
                                .textContentType(.username)
                                .autocorrectionDisabled()
                                #endif
                                .textFieldStyle(.roundedBorder)
                            HStack(spacing: 6) {
                                Image(systemName: "checkmark.seal.fill")
                                    .foregroundStyle(.green)
                                Text("Bait no requiere contraseña. Solo tu número a 10 dígitos.")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                        case .att:
                            Text("Cuenta Mi AT&T")
                                .font(.headline)
                            TextField("Número a 10 dígitos", text: $phone)
                                #if os(iOS)
                                .keyboardType(.numberPad)
                                .textContentType(.username)
                                .autocorrectionDisabled()
                                #endif
                                .textFieldStyle(.roundedBorder)
                            SecureField("Contraseña Mi AT&T", text: $password)
                                #if os(iOS)
                                .textContentType(.password)
                                #endif
                                .textFieldStyle(.roundedBorder)
                            Text("Tu número y contraseña del portal miattweb.att.com.mx.")
                                .font(.caption)
                                .foregroundStyle(.secondary)

                        case .movistar:
                            Text("Sesión Mi Movistar")
                                .font(.headline)
                            SecureField("Token de sesión p_id (ec_auth)", text: $token)
                                #if os(iOS)
                                .autocorrectionDisabled()
                                #endif
                                .textFieldStyle(.roundedBorder)
                            Text("Debido a reCAPTCHA v3 en Movistar, pega tu token de sesión p_id activa.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.horizontal)

                    // Desglose de Bolsas de Datos
                    if !entry.buckets.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("\(entry.planName) • \(entry.cutoffPrefix)\(entry.cutoffDate.isEmpty ? "N/A" : entry.cutoffDate)")
                                .font(.headline)

                            ForEach(entry.buckets, id: \.id) { bucket in
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text(bucket.name)
                                            .font(.subheadline.bold())
                                        Spacer()
                                        Text(String(format: "%.2f GB disp.", bucket.availableMB / entry.gbDivisor))
                                            .font(.subheadline)
                                            .foregroundStyle(.secondary)
                                    }
                                    Text(String(format: "Usados: %.2f GB de %.1f GB", bucket.consumedMB / entry.gbDivisor, bucket.totalMB / entry.gbDivisor))
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                .accessibilityElement(children: .combine)
                                .padding(12)
                                .background(Color.white.opacity(0.08))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                        }
                        .padding(.horizontal)
                    }

                    // Botón de Actualizar Consumo
                    Button {
                        Task {
                            isLoading = true
                            TelcelNetworkService.selectedCarrier = carrier
                            entry = await TelcelNetworkService.shared.fetchUsage(
                                carrier: carrier,
                                forceRefresh: true,
                                overridePhone: phone,
                                overridePassword: password,
                                overrideToken: token
                            )
                            let updatedCreds = TelcelNetworkService.loadCredentials(for: carrier)
                            phone = updatedCreds.phone
                            password = updatedCreds.password
                            token = updatedCreds.token
                            WidgetCenter.shared.reloadAllTimelines()
                            isLoading = false
                        }
                    } label: {
                        Label(isLoading ? "Actualizando..." : "Actualizar Consumo Ahora", systemImage: "arrow.clockwise")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(carrier.brandColor)
                    .disabled(isLoading)
                    .padding(.horizontal)
                }
                .padding(.vertical, 24)
            }
            .navigationTitle("Consumo Móvil")
            .onAppear {
                Task {
                    if let cached = await TelcelNetworkService.shared.loadCache(for: carrier) {
                        entry = cached
                    }
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func switchCarrier(to newCarrier: MobileCarrier) {
        TelcelNetworkService.selectedCarrier = newCarrier
        let creds = TelcelNetworkService.loadCredentials(for: newCarrier)
        phone = creds.phone
        password = creds.password
        token = creds.token
        Task {
            if let cached = await TelcelNetworkService.shared.loadCache(for: newCarrier) {
                entry = cached
            } else {
                entry = TelcelUsageEntry.sample(for: newCarrier)
            }
        }
    }
}
