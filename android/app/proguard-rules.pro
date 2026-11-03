# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Preserve annotations and line numbers for crash analysis
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keepattributes JavascriptInterface

# Preserve Capacitor core and plugins
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
}

# Preserve App Classes, Services, and Receivers
-keep class com.devfinity.viratcrm.** { *; }
-keepclassmembers class com.devfinity.viratcrm.** { *; }

# Preserve Google Play Services Location and Common
-keep class com.google.android.gms.location.** { *; }
-keep class com.google.android.gms.common.** { *; }
-dontwarn com.google.android.gms.**

# Preserve Community Plugins
-keep class com.capacitorcommunity.** { *; }
