from pathlib import Path
import xml.etree.ElementTree as ET

manifest = Path('android/app/src/main/AndroidManifest.xml')
ET.register_namespace('android', 'http://schemas.android.com/apk/res/android')
ns = '{http://schemas.android.com/apk/res/android}'
tree = ET.parse(manifest)
root = tree.getroot()
application = root.find('application')
if application is None:
    raise SystemExit('AndroidManifest sem application')
activity = application.find('activity')
if activity is None:
    raise SystemExit('AndroidManifest sem activity')
# Explicitly handle Supabase Auth callbacks in the Flutter Android app.
for intent in activity.findall('intent-filter'):
    for data in intent.findall('data'):
        if data.get(ns+'scheme') == 'br.com.entresuspeitos':
            print('Deep link já configurado')
            tree.write(manifest, encoding='utf-8', xml_declaration=True)
            raise SystemExit(0)
intent = ET.SubElement(activity, 'intent-filter')
ET.SubElement(intent, 'action', {ns+'name':'android.intent.action.VIEW'})
ET.SubElement(intent, 'category', {ns+'name':'android.intent.category.DEFAULT'})
ET.SubElement(intent, 'category', {ns+'name':'android.intent.category.BROWSABLE'})
ET.SubElement(intent, 'data', {ns+'scheme':'br.com.entresuspeitos',ns+'host':'auth-callback'})
# Flutter deep linking is intercepted by Supabase Flutter via app_links.
# Disable Flutter's own route-based deep-link handler to avoid duplicate routing.
meta = ET.SubElement(activity, 'meta-data')
meta.set(ns+'name', 'flutter_deeplinking_enabled')
meta.set(ns+'value', 'false')
tree.write(manifest, encoding='utf-8', xml_declaration=True)
print('Deep link de autenticação configurado: br.com.entresuspeitos://auth-callback')
